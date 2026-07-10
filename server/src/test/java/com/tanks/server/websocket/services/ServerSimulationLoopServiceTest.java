package com.tanks.server.websocket.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;

import com.tanks.server.websocket.dto.gameplay.OnlineDiffEnvelopeDto;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineStateDiffType;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.repositories.GameSessionRepository;

class ServerSimulationLoopServiceTest {

    @Test
    @DisplayName("The server simulation loop is scheduled at 30 Hz")
    void serverSimulationLoopIsScheduledAt30Hz() throws NoSuchMethodException {
        Scheduled scheduled = ServerSimulationLoopService.class
                .getMethod("runFrame")
                .getAnnotation(Scheduled.class);

        assertThat(scheduled).isNotNull();
        assertThat(scheduled.fixedRate()).isEqualTo(ServerSimulationLoopService.TICK_RATE_NANOS);
        assertThat(scheduled.timeUnit()).isEqualTo(java.util.concurrent.TimeUnit.NANOSECONDS);
    }

    @Test
    @DisplayName("Active Game Sessions advance one Server Tick per simulation frame")
    void activeGameSessionsAdvanceOneServerTickPerFrame() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setServerTick(41);
        gameSession.setPlayerTurnExpiresAt(100);

        when(harness.gameRepository.findByState(GameSessionState.STARTED)).thenReturn(List.of(gameSession));

        harness.service.runFrame();

        assertThat(gameSession.getServerTick()).isEqualTo(42);
        verify(harness.gameRepository).save(gameSession);
    }

    @Test
    @DisplayName("Turn Timer expiry advances the turn with no shot from the inactive player")
    void turnTimerExpiryAdvancesTheTurnWithoutShot() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setServerTick(899);
        gameSession.setPlayerTurnExpiresAt(900);
        gameSession.setPlayerTurn("host");
        gameSession.setTurnNumber(1);
        gameSession.setNextDiffSequence(2);

        harness.service.advance(gameSession);

        assertThat(gameSession.getServerTick()).isEqualTo(900);
        assertThat(gameSession.getPlayerTurn()).isEqualTo("opponent");
        assertThat(gameSession.getTurnNumber()).isEqualTo(2);
        assertThat(gameSession.getPlayerTurnExpiresAt()).isEqualTo(1800);
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(3);

        List<OnlineDiffEnvelopeDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).hasSize(1);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::type)
                .containsExactly(OnlineStateDiffType.TURN_TRANSITION);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::sequence).containsExactly(2L);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::serverTick).containsExactly(900L);
        assertThat(gameSession.getLastDiffServerTick()).isEqualTo(900);

        OnlineDiffPayloads.TurnTransition payload = (OnlineDiffPayloads.TurnTransition) diffs.getFirst().payload();
        assertThat(payload.previousPlayerId()).isEqualTo(1);
        assertThat(payload.activePlayerId()).isEqualTo(2);
        assertThat(payload.turnNumber()).isEqualTo(2);
        assertThat(payload.turnEndsAtServerTick()).isEqualTo(1800);
    }

    @Test
    @DisplayName("The server simulation loop does not depend on connected players")
    void disconnectsDoNotPauseSimulationLoop() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setConnectedPlayerCount(0);
        gameSession.setServerTick(7);
        gameSession.setPlayerTurnExpiresAt(100);

        when(harness.gameRepository.findByState(GameSessionState.STARTED)).thenReturn(List.of(gameSession));

        harness.service.runFrame();

        assertThat(gameSession.getServerTick()).isEqualTo(8);
        verify(harness.gameRepository).save(gameSession);
    }

    @Test
    @DisplayName("Only active Game Sessions are advanced by the simulation frame")
    void onlyActiveGameSessionsAreAdvanced() {
        TestHarness harness = new TestHarness();
        GameSession started = startedGameSession();
        started.setServerTick(5);
        started.setPlayerTurnExpiresAt(100);
        when(harness.gameRepository.findByState(GameSessionState.STARTED)).thenReturn(List.of(started));

        harness.service.runFrame();

        assertThat(started.getServerTick()).isEqualTo(6);
        verify(harness.gameRepository).save(started);
        verify(harness.gameRepository, times(1)).save(any(GameSession.class));
    }

    @Test
    @DisplayName("Ended Game Sessions are deleted after the final-delivery grace period")
    void endedGameSessionsAreCleanedUpAfterGracePeriod() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setState(GameSessionState.ENDED);
        gameSession.setEndedAt(OffsetDateTime.now()
                .minusSeconds(ServerSimulationLoopService.TERMINAL_DELIVERY_GRACE_SECONDS + 1));
        when(harness.gameRepository.findByState(GameSessionState.ENDED)).thenReturn(List.of(gameSession));

        harness.service.cleanupTerminalSessions();

        verify(harness.gameRepository).delete(gameSession);
        verify(harness.redisTemplate).delete("gameSession:" + gameSession.getId());
    }

    @Test
    @DisplayName("Recently ended Game Sessions remain available during final delivery")
    void recentlyEndedGameSessionsAreNotCleanedUp() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setState(GameSessionState.ENDED);
        gameSession.setEndedAt(OffsetDateTime.now());
        when(harness.gameRepository.findByState(GameSessionState.ENDED)).thenReturn(List.of(gameSession));

        harness.service.cleanupTerminalSessions();

        verify(harness.gameRepository, times(0)).delete(any(GameSession.class));
        verify(harness.redisTemplate, times(0)).delete(any(String.class));
    }

    private static GameSession startedGameSession() {
        return GameSession.builder()
                .id(UUID.randomUUID())
                .playerA("host")
                .playerB("opponent")
                .playerTurn("host")
                .playerTurnExpiresAt(ServerSimulationLoopService.TURN_TIMER_TICKS)
                .serverTick(0)
                .turnNumber(1)
                .nextDiffSequence(2)
                .lastDiffServerTick(0)
                .state(GameSessionState.STARTED)
                .build();
    }

    private static List<OnlineDiffEnvelopeDto<?>> gameplayDiffs(TestHarness harness) {
        return harness.events.stream()
                .filter(OnlineGameplayEvent.class::isInstance)
                .map(OnlineGameplayEvent.class::cast)
                .map(OnlineGameplayEvent::getPayload)
                .toList();
    }

    private static class TestHarness {
        private final GameSessionRepository gameRepository = mock(GameSessionRepository.class);
        private final List<Object> events = new ArrayList<>();
        private final ApplicationEventPublisher eventPublisher = events::add;
        private final RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
        private final ServerSimulationLoopService service = new ServerSimulationLoopService(
                gameRepository,
                eventPublisher,
                redisTemplate);
    }
}
