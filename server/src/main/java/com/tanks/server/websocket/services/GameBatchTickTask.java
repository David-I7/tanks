package com.tanks.server.websocket.services;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponseDto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineStateDiffResponseType;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.TerminalGameReason;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.TurnPhase;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.TerminalGame;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.TurnTransition;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import org.springframework.context.ApplicationEventPublisher;

import java.time.OffsetDateTime;
import java.util.List;

import static com.tanks.server.websocket.services.ServerSimulationLoopService.TICKS_PER_SECOND;
import static com.tanks.server.websocket.services.ServerSimulationLoopService.TURN_TIMER_TICKS;

public class GameBatchTickTask implements Runnable {

    private final List<GameSession> games;
    private final ApplicationEventPublisher eventPublisher;
    private final GameSessionService gameSessionService;
    private final GameContentCatalog contentCatalog;
    private final GameSessionRepository gameSessionRepository;

    public GameBatchTickTask(List<GameSession> games, ApplicationEventPublisher eventPublisher, GameSessionService gameSessionService, GameSessionRepository gameSessionRepository, GameContentCatalog contentCatalog) {
        this.games = games;
        this.eventPublisher = eventPublisher;
        this.gameSessionService = gameSessionService;
        this.gameSessionRepository = gameSessionRepository;
        this.contentCatalog = contentCatalog;
    }

    @Override
    public void run() {
        for (GameSession gameSession : games) {
            try {
                advance(gameSession);
            }catch (Exception e) {
                gameSessionRepository.delete(gameSession);
            }
        }
    }


    void advance(GameSession gameSession) {
        long nextServerTick = gameSession.getServerTick() + 1;
        gameSession.setServerTick(nextServerTick);

        if (gameSession.getWorld() != null) {
            tickDamageTrails(gameSession.getWorld());
            tickLootCrates(gameSession);
            checkDamageTrailKills(gameSession);
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

        gameSessionRepository.save(gameSession);
    }

    private void checkDamageTrailKills(GameSession gameSession) {
        if (gameSession == null || gameSession.getWorld() == null || gameSession.getState() != GameSessionState.STARTED) {
            return;
        }
        var tank1 = gameSession.getWorld().requireTankByPlayer(1L);
        var tank2 = gameSession.getWorld().requireTankByPlayer(2L);
        if ((!tank1.alive() || !tank2.alive()) && gameSessionService != null) {
            gameSessionService.executePendingTurnTransition(gameSession);
        }
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
                    applyCrateRefill(tank, crate, gameSession);
                    crate.collected(true);
                    iterator.remove();
                    break;
                }
            }
        }
    }

    private void applyCrateRefill(com.tanks.server.websocket.gameplay.world.TankState tank, com.tanks.server.websocket.gameplay.world.LootCrateState crate, GameSession session) {
        int val = crate.value() != null ? crate.value() : 25;
        int maxHp = 100;
        int maxFuel = 100;
        if (contentCatalog != null && session != null && session.getGameContentVersion() != null) {
            var content = contentCatalog.require(session.getGameContentVersion());
            var tankDef = content.requireTank(tank.definitionId());
            maxHp = tankDef.maxHealth();
            maxFuel = tankDef.maxFuel();
        }
        if ("hp".equalsIgnoreCase(crate.crateType())) {
            tank.health(Math.min(maxHp, tank.health() + val));
        } else if ("fuel".equalsIgnoreCase(crate.crateType()) || "ammo".equalsIgnoreCase(crate.crateType())) {
            tank.fuel(Math.min(maxFuel, tank.fuel() + val));
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
            gameSessionRepository.save(gameSession);
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

    private void advanceTurnWithoutShot(GameSession gameSession) {
        long previousPlayerId = gameSession.getWorld().match().activePlayerId();
        long activePlayerId = previousPlayerId == 1 ? 2 : 1;

        if (gameSessionService != null) {
            gameSessionService.publishTurnStartBatch(gameSession, previousPlayerId, activePlayerId);
        } else {
            gameSession.getWorld().match().activePlayerId(activePlayerId);
            gameSession.getWorld().match().turnNumber(gameSession.getWorld().match().turnNumber() + 1);
            gameSession.getWorld().match().turnEndsAtServerTick(gameSession.getServerTick() + TURN_TIMER_TICKS);
            if (contentCatalog != null && gameSession.getGameContentVersion() != null) {
                double wind = contentCatalog.require(gameSession.getGameContentVersion()).world().generateWind();
                gameSession.getWorld().match().wind(wind);
            }
            publishTurnTransition(gameSession, previousPlayerId, activePlayerId);
        }
    }

    private void publishTurnTransition(GameSession gameSession, long previousPlayerId, long activePlayerId) {
        OnlineDiffResponseDto diff = new OnlineDiffResponseDto(
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
