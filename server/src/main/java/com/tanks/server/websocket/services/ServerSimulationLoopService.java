package com.tanks.server.websocket.services;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationListener;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponseDto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.actions.*;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.*;
import com.tanks.server.websocket.dto.gameplay.diffResponse.states.*;
import com.tanks.server.websocket.dto.gameplay.OnlineGameplayProtocolVersion;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineStateDiffResponseType;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.repositories.GameSessionRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class ServerSimulationLoopService implements ApplicationListener<ContextClosedEvent> {

    public static final int TICKS_PER_SECOND = 30;
    public static final int TURN_TIMER_TICKS = TICKS_PER_SECOND * 30;
    public static final int TERMINAL_DELIVERY_GRACE_SECONDS = 5;
    public static final long TICK_RATE_NANOS = 1_000_000_000L / TICKS_PER_SECOND;
    public static final int BATCH_SIZE = 15;

    private final GameSessionRepository gameRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final GameSessionService gameSessionService;
    private final ScheduledExecutorService executorService;
    private volatile boolean acceptingFrames = true;

    public ServerSimulationLoopService(GameSessionRepository gameRepository, ApplicationEventPublisher eventPublisher) {
        this(gameRepository, eventPublisher, null, createDefaultExecutorService());
    }

    @Autowired
    public ServerSimulationLoopService(
            GameSessionRepository gameRepository,
            ApplicationEventPublisher eventPublisher,
            GameSessionService gameSessionService) {
        this(gameRepository, eventPublisher, gameSessionService, createDefaultExecutorService());
    }

    public ServerSimulationLoopService(
            GameSessionRepository gameRepository,
            ApplicationEventPublisher eventPublisher,
            GameSessionService gameSessionService,
            ScheduledExecutorService executorService) {
        this.gameRepository = gameRepository;
        this.eventPublisher = eventPublisher;
        this.gameSessionService = gameSessionService;
        this.executorService = executorService;
    }

    private static ScheduledExecutorService createDefaultExecutorService() {
        int threads = Math.max(4, Runtime.getRuntime().availableProcessors());
        return Executors.newScheduledThreadPool(threads);
    }

    @Scheduled(fixedRate = TICK_RATE_NANOS, timeUnit = TimeUnit.NANOSECONDS)
    public void runFrame() {
        if (!acceptingFrames) {
            return;
        }

        try {
            List<GameSession> activeGames = activeSessions();
            if (activeGames.isEmpty()) {
                return;
            }

            List<List<GameSession>> batches = partition(activeGames, BATCH_SIZE);
            if (executorService == null || executorService.isShutdown()) {
                for (List<GameSession> batch : batches) {
                    new GameBatchTickTask(batch, this).run();
                }
            } else {
                List<CompletableFuture<Void>> futures = new ArrayList<>();
                for (List<GameSession> batch : batches) {
                    futures.add(CompletableFuture.runAsync(new GameBatchTickTask(batch, this), executorService));
                }
                CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            }
        } catch (DataAccessException ex) {
            if (acceptingFrames) {
                log.warn("Skipping server simulation frame because active sessions could not be loaded.", ex);
            } else {
                log.debug("Skipping server simulation frame during shutdown.", ex);
            }
        } catch (Exception ex) {
            log.error("Error executing simulation loop frame", ex);
        }
    }

    static <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> partitions = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            partitions.add(new ArrayList<>(list.subList(i, Math.min(i + size, list.size()))));
        }
        return partitions;
    }

    @Scheduled(fixedRate = 1, timeUnit = TimeUnit.SECONDS)
    public void cleanupTerminalSessions() {
        if (!acceptingFrames) {
            return;
        }

        try {
            OffsetDateTime now = OffsetDateTime.now();
            for (GameSession gameSession : terminalSessions()) {
                if (isReadyForCleanup(gameSession, now)) {
                    gameRepository.delete(gameSession);
                }
            }
        } catch (DataAccessException ex) {
            if (acceptingFrames) {
                log.warn("Skipping terminal game cleanup because ended sessions could not be loaded.", ex);
            } else {
                log.debug("Skipping terminal game cleanup during shutdown.", ex);
            }
        }
    }

    @Override
    public void onApplicationEvent(ContextClosedEvent event) {
        acceptingFrames = false;
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
        }
    }

    void advance(GameSession gameSession) {
        long nextServerTick = gameSession.getServerTick() + 1;
        gameSession.setServerTick(nextServerTick);

        if (gameSession.getWorld() != null) {
            tickDamageTrails(gameSession.getWorld());
            tickLootCrates(gameSession);
        }

        if (gameSessionService != null && gameSession.getPendingTurnTransitionAtServerTick() > 0
                && nextServerTick >= gameSession.getPendingTurnTransitionAtServerTick()) {
            gameSessionService.executePendingTurnTransition(gameSession);
        }

        if (gameSession.getMatchEndsAtServerTick() > 0 && nextServerTick >= gameSession.getMatchEndsAtServerTick()) {
            handleMatchExpiration(gameSession);
            return;
        }

        if (gameSession.getWorld() != null && gameSession.getWorld().match() != null
                && gameSession.getWorld().match().turnEndsAtServerTick() <= nextServerTick) {
            advanceTurnWithoutShot(gameSession);
        }

        gameRepository.save(gameSession);
    }

    public void tickLootCrates(GameSession gameSession) {
        if (gameSession == null || gameSession.getWorld() == null || gameSession.getWorld().lootCrates() == null || gameSession.getWorld().lootCrates().isEmpty()) {
            return;
        }
        var iterator = gameSession.getWorld().lootCrates().iterator();
        while (iterator.hasNext()) {
            com.tanks.server.websocket.gameplay.world.LootCrateState crate = iterator.next();
            if (crate.collected()) {
                iterator.remove();
                continue;
            }

            if (crate.isLanding()) {
                double dropSpeedPerTick = 150.0 / (double) TICKS_PER_SECOND;
                double newY = crate.y() + dropSpeedPerTick;
                if (newY >= crate.targetY()) {
                    crate.y(crate.targetY());
                    crate.isLanding(false);
                } else {
                    crate.y(newY);
                }
            }

            for (com.tanks.server.websocket.gameplay.world.TankState tank : gameSession.getWorld().tanks().values()) {
                if (!tank.alive()) continue;
                double dist = Math.hypot(tank.position().x() - crate.x(), tank.position().y() - crate.y());
                if (dist <= 35.0) {
                    applyCrateRefill(tank, crate);
                    crate.collected(true);
                    iterator.remove();
                    break;
                }
            }
        }
    }

    private void applyCrateRefill(com.tanks.server.websocket.gameplay.world.TankState tank, com.tanks.server.websocket.gameplay.world.LootCrateState crate) {
        int val = crate.value() != null ? crate.value() : 25;
        if ("hp".equalsIgnoreCase(crate.crateType())) {
            tank.health(tank.health() + val);
        } else if ("fuel".equalsIgnoreCase(crate.crateType()) || "ammo".equalsIgnoreCase(crate.crateType())) {
            tank.fuel(tank.fuel() + val);
        }
    }

    public void tickDamageTrails(com.tanks.server.websocket.gameplay.world.World world) {
        if (world == null || world.damageTrails() == null || world.damageTrails().isEmpty()) {
            return;
        }
        var iterator = world.damageTrails().iterator();
        while (iterator.hasNext()) {
            com.tanks.server.websocket.gameplay.world.DamageTrailState trail = iterator.next();
            trail.remainingTicks(trail.remainingTicks() - 1);

            double dpsPerTick = trail.damagePerSecond() / (double) TICKS_PER_SECOND;

            for (com.tanks.server.websocket.gameplay.world.TankState tank : world.tanks().values()) {
                if (!tank.alive()) continue;
                double dist = Math.hypot(tank.position().x() - trail.position().x(), tank.position().y() - trail.position().y());
                if (dist <= trail.radius()) {
                    double currentBuffer = trail.damageBuffers().getOrDefault(tank.entityId(), 0.0) + dpsPerTick;
                    if (currentBuffer >= 1.0) {
                        int damageToApply = (int) Math.floor(currentBuffer);
                        tank.health(tank.health() - damageToApply);
                        currentBuffer -= damageToApply;
                    }
                    trail.damageBuffers().put(tank.entityId(), currentBuffer);
                }
            }

            if (trail.remainingTicks() <= 0) {
                iterator.remove();
            }
        }
    }

    private void handleMatchExpiration(GameSession gameSession) {
        Long winnerPlayerId = evaluateWinnerOnExpiration(gameSession);
        if (gameSessionService != null) {
            gameSessionService.finalizeMatchTimeExpired(gameSession, winnerPlayerId);
        } else {
            gameSession.setEndedAt(OffsetDateTime.now());
            gameSession.setState(GameSessionState.ENDED);
            if (gameSession.getWorld() != null) {
                gameSession.getWorld().match().winnerPlayerId(winnerPlayerId);
            }
            OnlineDiffResponseDto diff = new OnlineDiffResponseDto(
                    OnlineGameplayProtocolVersion.V1,
                    gameSession.getId().toString(),
                    gameSession.getNextDiffSequence(),
                    gameSession.getServerTick(),
                    OnlineStateDiffResponseType.TERMINAL_GAME,
                    null,
                    new TerminalGame(
                            winnerPlayerId,
                            TerminalGameReason.MATCH_TIME_EXPIRED,
                            null));
            gameSession.setNextDiffSequence(gameSession.getNextDiffSequence() + 1);
            gameSession.setLastDiffServerTick(gameSession.getServerTick());
            eventPublisher.publishEvent(new OnlineGameplayEvent(
                    this,
                    null,
                    "/topic/game/" + gameSession.getId(),
                    diff));
            gameRepository.save(gameSession);
        }
    }

    private Long evaluateWinnerOnExpiration(GameSession gameSession) {
        if (gameSession.getWorld() == null) {
            return 1L;
        }
        var tankA = gameSession.getWorld().tanks().get(1L);
        var tankB = gameSession.getWorld().tanks().get(2L);
        int healthA = tankA != null ? tankA.health() : 0;
        int healthB = tankB != null ? tankB.health() : 0;
        if (healthA > healthB) {
            return 1L;
        } else if (healthB > healthA) {
            return 2L;
        }
        return 1L;
    }

    private List<GameSession> activeSessions() {
        return gameRepository.findByState(GameSessionState.STARTED);
    }

    private List<GameSession> terminalSessions() {
        return gameRepository.findByState(GameSessionState.ENDED);
    }

    private boolean isReadyForCleanup(GameSession gameSession, OffsetDateTime now) {
        return gameSession.getEndedAt() != null
                && !gameSession.getEndedAt().plusSeconds(TERMINAL_DELIVERY_GRACE_SECONDS).isAfter(now);
    }

    private void advanceTurnWithoutShot(GameSession gameSession) {
        long previousPlayerId = gameSession.getWorld().match().activePlayerId();
        long activePlayerId = previousPlayerId == 1 ? 2 : 1;
        gameSession.getWorld().match().activePlayerId(activePlayerId);
        gameSession.getWorld().match().turnNumber(gameSession.getWorld().match().turnNumber() + 1);
        gameSession.getWorld().match().turnEndsAtServerTick(gameSession.getServerTick() + TURN_TIMER_TICKS);

        publishTurnTransition(gameSession, previousPlayerId, activePlayerId);
    }

    private void publishTurnTransition(GameSession gameSession, long previousPlayerId, long activePlayerId) {
        OnlineDiffResponseDto diff = new OnlineDiffResponseDto(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                gameSession.getNextDiffSequence(),
                gameSession.getServerTick(),
                OnlineStateDiffResponseType.TURN_TRANSITION,
                null,
                new TurnTransition(
                        previousPlayerId,
                        activePlayerId,
                        gameSession.getWorld().match().turnNumber(),
                        TurnPhase.AIMING,
                        gameSession.getWorld().match().turnEndsAtServerTick(),
                        gameSession.getMatchEndsAtServerTick(),
                        gameSession.getWorld() != null && gameSession.getWorld().match() != null ? gameSession.getWorld().match().wind() : 0.0));

        gameSession.setNextDiffSequence(gameSession.getNextDiffSequence() + 1);
        gameSession.setTurnStartDiffSequence(gameSession.getNextDiffSequence() - 1);
        gameSession.setLastDiffServerTick(gameSession.getServerTick());
        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                null,
                "/topic/game/" + gameSession.getId(),
                diff));
    }

}
