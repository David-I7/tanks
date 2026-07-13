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
import org.springframework.scheduling.annotation.Scheduled;

import com.tanks.server.websocket.dto.gameplay.OnlineDiffResponseDto;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffResponsePayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineStateDiffResponseType;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.gameplay.world.World;
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
        gameSession.getWorld().match().turnEndsAtServerTick(100);

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
        gameSession.getWorld().match().turnEndsAtServerTick(900);
        gameSession.getWorld().match().activePlayerId(1);
        gameSession.getWorld().match().turnNumber(1);
        gameSession.setNextDiffSequence(2);

        harness.service.advance(gameSession);

        assertThat(gameSession.getServerTick()).isEqualTo(900);
        assertThat(gameSession.getWorld().match().activePlayerId()).isEqualTo(2);
        assertThat(gameSession.getWorld().match().turnNumber()).isEqualTo(2);
        assertThat(gameSession.getWorld().match().turnEndsAtServerTick()).isEqualTo(1800);
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(3);

        List<OnlineDiffResponseDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).hasSize(1);
        assertThat(diffs).extracting(OnlineDiffResponseDto::type)
                .containsExactly(OnlineStateDiffResponseType.TURN_TRANSITION);
        assertThat(diffs).extracting(OnlineDiffResponseDto::sequence).containsExactly(2L);
        assertThat(diffs).extracting(OnlineDiffResponseDto::serverTick).containsExactly(900L);
        assertThat(gameSession.getLastDiffServerTick()).isEqualTo(900);

        OnlineDiffResponsePayloads.TurnTransition payload = (OnlineDiffResponsePayloads.TurnTransition) diffs.getFirst().payload();
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
        gameSession.getWorld().match().turnEndsAtServerTick(100);

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
        started.getWorld().match().turnEndsAtServerTick(100);
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
    }

    private static GameSession startedGameSession() {
        return GameSession.builder()
                .id(UUID.randomUUID())
                .playerA("host")
                .playerB("opponent")
                .serverTick(0)
                .nextDiffSequence(2)
                .lastDiffServerTick(0)
                .state(GameSessionState.STARTED)
                .world(initialWorld())
                .build();
    }

    private static World initialWorld() {
        World world = new World();
        world.match().activePlayerId(1);
        world.match().turnNumber(1);
        world.match().turnEndsAtServerTick(ServerSimulationLoopService.TURN_TIMER_TICKS);
        return world;
    }

    private static List<OnlineDiffResponseDto<?>> gameplayDiffs(TestHarness harness) {
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
        private final ServerSimulationLoopService service = new ServerSimulationLoopService(
                gameRepository,
                eventPublisher);
    }
}
