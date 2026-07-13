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

import com.tanks.server.websocket.dto.gameplay.OnlineDiffEnvelopeDto;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineGameplayProtocolVersion;
import com.tanks.server.websocket.dto.gameplay.OnlineStateDiffType;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.repositories.GameSessionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServerSimulationLoopService implements ApplicationListener<ContextClosedEvent> {

    public static final int TICKS_PER_SECOND = 30;
    public static final int TURN_TIMER_TICKS = TICKS_PER_SECOND * 30;
    public static final int TERMINAL_DELIVERY_GRACE_SECONDS = 5;
    public static final long TICK_RATE_NANOS = 1_000_000_000L / TICKS_PER_SECOND;

    private final GameSessionRepository gameRepository;
    private final ApplicationEventPublisher eventPublisher;
    private volatile boolean acceptingFrames = true;

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

        if (gameSession.getPlayerTurnExpiresAt() <= nextServerTick) {
            advanceTurnWithoutShot(gameSession);
        }

        gameRepository.save(gameSession);
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
        String previousPlayer = gameSession.getPlayerTurn();
        String nextPlayer = nextPlayer(gameSession, previousPlayer);

        gameSession.setPlayerTurn(nextPlayer);
        gameSession.setTurnNumber(gameSession.getTurnNumber() + 1);
        gameSession.setPlayerTurnExpiresAt(gameSession.getServerTick() + TURN_TIMER_TICKS);

        publishTurnTransition(gameSession, playerId(gameSession, previousPlayer), playerId(gameSession, nextPlayer));
    }

    private String nextPlayer(GameSession gameSession, String previousPlayer) {
        if (gameSession.getPlayerA().equals(previousPlayer)) {
            return gameSession.getPlayerB();
        }
        return gameSession.getPlayerA();
    }

    private void publishTurnTransition(GameSession gameSession, long previousPlayerId, long activePlayerId) {
        OnlineDiffEnvelopeDto<OnlineDiffPayloads.TurnTransition> diff = new OnlineDiffEnvelopeDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                gameSession.getNextDiffSequence(),
                gameSession.getServerTick(),
                OnlineStateDiffType.TURN_TRANSITION,
                null,
                new OnlineDiffPayloads.TurnTransition(
                        previousPlayerId,
                        activePlayerId,
                        gameSession.getTurnNumber(),
                        OnlineDiffPayloads.TurnPhase.AIMING,
                        gameSession.getPlayerTurnExpiresAt()));

        gameSession.setNextDiffSequence(gameSession.getNextDiffSequence() + 1);
        gameSession.setLastDiffServerTick(gameSession.getServerTick());
        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                null,
                "/topic/game/" + gameSession.getId(),
                diff));
    }

    private long playerId(GameSession gameSession, String player) {
        if (gameSession.getPlayerA().equals(player)) {
            return 1;
        }
        return 2;
    }
}
