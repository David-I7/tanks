package com.tanks.server.websocket.services;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.context.ApplicationListener;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.tanks.server.websocket.dto.gameplay.OnlineDiffResponseDto;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffResponsePayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineGameplayProtocolVersion;
import com.tanks.server.websocket.dto.gameplay.OnlineStateDiffResponseType;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.repositories.GameSessionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class ServerSimulationLoopService implements ApplicationListener<ContextClosedEvent> {

    public static final int TICKS_PER_SECOND = 30;
    public static final int TURN_TIMER_TICKS = TICKS_PER_SECOND * 30;
    public static final int TERMINAL_DELIVERY_GRACE_SECONDS = 5;
    public static final long TICK_RATE_NANOS = 1_000_000_000L / TICKS_PER_SECOND;

    private final GameSessionRepository gameRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final GameSessionService gameSessionService;
    private volatile boolean acceptingFrames = true;

    public ServerSimulationLoopService(GameSessionRepository gameRepository, ApplicationEventPublisher eventPublisher) {
        this(gameRepository, eventPublisher, null);
    }

    public ServerSimulationLoopService(
            GameSessionRepository gameRepository,
            ApplicationEventPublisher eventPublisher,
            GameSessionService gameSessionService) {
        this.gameRepository = gameRepository;
        this.eventPublisher = eventPublisher;
        this.gameSessionService = gameSessionService;
    }

    @Scheduled(fixedRate = TICK_RATE_NANOS, timeUnit = TimeUnit.NANOSECONDS)
    public void runFrame() {
        if (!acceptingFrames) {
            return;
        }

        try {
            for (GameSession gameSession : activeSessions()) {
                advance(gameSession);
            }
        } catch (DataAccessException ex) {
            if (acceptingFrames) {
                log.warn("Skipping server simulation frame because active sessions could not be loaded.", ex);
            } else {
                log.debug("Skipping server simulation frame during shutdown.", ex);
            }
        }
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
    }

    void advance(GameSession gameSession) {
        long nextServerTick = gameSession.getServerTick() + 1;
        gameSession.setServerTick(nextServerTick);

        if (gameSession.getMatchEndsAtServerTick() > 0 && nextServerTick >= gameSession.getMatchEndsAtServerTick()) {
            handleMatchExpiration(gameSession);
            return;
        }

        if (gameSession.getWorld().match().turnEndsAtServerTick() <= nextServerTick) {
            advanceTurnWithoutShot(gameSession);
        }

        gameRepository.save(gameSession);
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
            OnlineDiffResponseDto<OnlineDiffResponsePayloads.TerminalGame> diff = new OnlineDiffResponseDto<>(
                    OnlineGameplayProtocolVersion.V1,
                    gameSession.getId().toString(),
                    gameSession.getNextDiffSequence(),
                    gameSession.getServerTick(),
                    OnlineStateDiffResponseType.TERMINAL_GAME,
                    null,
                    new OnlineDiffResponsePayloads.TerminalGame(
                            winnerPlayerId,
                            OnlineDiffResponsePayloads.TerminalGameReason.MATCH_TIME_EXPIRED,
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
        OnlineDiffResponseDto<OnlineDiffResponsePayloads.TurnTransition> diff = new OnlineDiffResponseDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                gameSession.getNextDiffSequence(),
                gameSession.getServerTick(),
                OnlineStateDiffResponseType.TURN_TRANSITION,
                null,
                new OnlineDiffResponsePayloads.TurnTransition(
                        previousPlayerId,
                        activePlayerId,
                        gameSession.getWorld().match().turnNumber(),
                        OnlineDiffResponsePayloads.TurnPhase.AIMING,
                        gameSession.getWorld().match().turnEndsAtServerTick(),
                        gameSession.getMatchEndsAtServerTick()));

        gameSession.setNextDiffSequence(gameSession.getNextDiffSequence() + 1);
        gameSession.setLastDiffServerTick(gameSession.getServerTick());
        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                null,
                "/topic/game/" + gameSession.getId(),
                diff));
    }

}
