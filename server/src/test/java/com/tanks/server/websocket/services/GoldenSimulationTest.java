package com.tanks.server.websocket.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;

import com.tanks.server.repositories.GameResultRepository;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffEnvelopeDto;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineIntentPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlinePlayerIntentDto;
import com.tanks.server.websocket.dto.gameplay.OnlinePlayerIntentType;
import com.tanks.server.websocket.dto.gameplay.OnlineStateDiffType;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.gameplay.OnlineGameplayDefinitionCatalog;
import com.tanks.server.websocket.gameplay.OnlineGameplayRules;
import com.tanks.server.websocket.gameplay.OnlineInitialStateFactory;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;

class GoldenSimulationTest {

    @Test
    @DisplayName("Golden simulation case: Movement")
    void movementScenario() throws Exception {
        TestHarness harness = new TestHarness();
        UUID gameSessionId = UUID.fromString("00000000-0000-0000-0000-000000000123");
        
        GameSession gameSession = GameSession.builder()
                .id(gameSessionId)
                .playerA("host")
                .playerB("opponent")
                .playerTurn("host")
                .playerTurnExpiresAt(900)
                .serverTick(0)
                .turnNumber(1)
                .nextDiffSequence(2)
                .lastDiffServerTick(0)
                .state(GameSessionState.STARTED)
                .playerATankX(160.0)
                .playerATankY(420.0)
                .playerATankHealth(110.0)
                .playerATankFuel(100.0)
                .playerBTankX(800.0)
                .playerBTankY(420.0)
                .playerBTankHealth(100.0)
                .playerBTankFuel(100.0)
                .gameplayDefinitionVersion("online-gameplay-definitions.v1")
                .build();

        when(harness.gameRepository.findById(gameSessionId)).thenReturn(Optional.of(gameSession));
        when(harness.gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Submit the move intent
        var intent = new OnlinePlayerIntentDto<>(
                com.tanks.server.websocket.dto.gameplay.OnlineGameplayProtocolVersion.V1,
                gameSessionId.toString(),
                1L,
                "intent-move-1",
                1L,
                0L,
                OnlinePlayerIntentType.MOVE,
                new OnlineIntentPayloads.Move(1)
        );

        boolean accepted = harness.service.acceptPlayerIntent("host", gameSessionId, intent);
        assertThat(accepted).isTrue();

        // Check emitted diffs
        List<OnlineDiffEnvelopeDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).hasSize(1);
        assertThat(diffs.get(0).type()).isEqualTo(OnlineStateDiffType.MOVEMENT_SEGMENT);
        assertThat(diffs.get(0).sequence()).isEqualTo(2);

        // Check state updates
        assertThat(gameSession.getPlayerATankX()).isEqualTo(161.0);
        assertThat(gameSession.getPlayerATankFuel()).isEqualTo(99.0);
        assertThat(gameSession.getLastDiffServerTick()).isEqualTo(6);
    }

    @Test
    @DisplayName("Golden simulation case: Projectile impact, terrain damage, damage application")
    void projectileImpactScenario() throws Exception {
        TestHarness harness = new TestHarness();
        UUID gameSessionId = UUID.fromString("00000000-0000-0000-0000-000000000123");
        
        GameSession gameSession = GameSession.builder()
                .id(gameSessionId)
                .playerA("host")
                .playerB("opponent")
                .playerTurn("host")
                .playerTurnExpiresAt(900)
                .serverTick(0)
                .turnNumber(1)
                .nextDiffSequence(2)
                .lastDiffServerTick(0)
                .state(GameSessionState.STARTED)
                .playerATankX(160.0)
                .playerATankY(420.0)
                .playerATankHealth(110.0)
                .playerATankFuel(100.0)
                .playerBTankX(800.0)
                .playerBTankY(420.0)
                .playerBTankHealth(94.0)
                .playerBTankFuel(100.0)
                .gameplayDefinitionVersion("online-gameplay-definitions.v1")
                .build();

        when(harness.gameRepository.findById(gameSessionId)).thenReturn(Optional.of(gameSession));
        when(harness.gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Submit the fire intent
        var intent = new OnlinePlayerIntentDto<>(
                com.tanks.server.websocket.dto.gameplay.OnlineGameplayProtocolVersion.V1,
                gameSessionId.toString(),
                1L,
                "intent-fire-1",
                1L,
                0L,
                OnlinePlayerIntentType.FIRE,
                new OnlineIntentPayloads.Fire(7.0, 0.96, "standard")
        );

        boolean accepted = harness.service.acceptPlayerIntent("host", gameSessionId, intent);
        assertThat(accepted).isTrue();

        // Check emitted diffs
        List<OnlineDiffEnvelopeDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::type).containsExactly(
                OnlineStateDiffType.PROJECTILE_RESOLUTION,
                OnlineStateDiffType.TERRAIN_PATCH,
                OnlineStateDiffType.TURN_TRANSITION
        );

        // Check state updates
        assertThat(gameSession.getPlayerBTankHealth()).isEqualTo(46.0);
        assertThat(gameSession.getPlayerTurn()).isEqualTo("opponent");
        assertThat(gameSession.getTurnNumber()).isEqualTo(2);
    }

    @Test
    @DisplayName("Golden simulation case: Turn timeout, no-shot advance, disconnect continuation")
    void turnTimeoutScenario() throws Exception {
        TestHarness harness = new TestHarness();
        UUID gameSessionId = UUID.fromString("00000000-0000-0000-0000-000000000123");
        
        GameSession gameSession = GameSession.builder()
                .id(gameSessionId)
                .playerA("host")
                .playerB("opponent")
                .playerTurn("opponent")
                .playerTurnExpiresAt(900)
                .serverTick(0)
                .turnNumber(2)
                .nextDiffSequence(2)
                .lastDiffServerTick(0)
                .state(GameSessionState.STARTED)
                .playerATankX(160.0)
                .playerATankY(420.0)
                .playerATankHealth(110.0)
                .playerATankFuel(100.0)
                .playerBTankX(800.0)
                .playerBTankY(420.0)
                .playerBTankHealth(46.0)
                .playerBTankFuel(100.0)
                .gameplayDefinitionVersion("online-gameplay-definitions.v1")
                .build();

        when(harness.gameRepository.findById(gameSessionId)).thenReturn(Optional.of(gameSession));
        when(harness.gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Let turn expire
        gameSession.setServerTick(900);
        harness.loopService.advance(gameSession);

        // Check turn transitions
        List<OnlineDiffEnvelopeDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).hasSize(1);
        assertThat(diffs.get(0).type()).isEqualTo(OnlineStateDiffType.TURN_TRANSITION);
        
        OnlineDiffPayloads.TurnTransition turn = (OnlineDiffPayloads.TurnTransition) diffs.get(0).payload();
        assertThat(turn.previousPlayerId()).isEqualTo(2);
        assertThat(turn.activePlayerId()).isEqualTo(1);
        assertThat(turn.turnNumber()).isEqualTo(3);

        assertThat(gameSession.getPlayerTurn()).isEqualTo("host");
        assertThat(gameSession.getTurnNumber()).isEqualTo(3);
    }

    @Test
    @DisplayName("Golden simulation case: Resync after missed diffs")
    void resyncScenario() throws Exception {
        TestHarness harness = new TestHarness();
        UUID gameSessionId = UUID.fromString("00000000-0000-0000-0000-000000000123");
        
        GameSession gameSession = GameSession.builder()
                .id(gameSessionId)
                .playerA("host")
                .playerB("opponent")
                .playerTurn("host")
                .playerTurnExpiresAt(1800)
                .serverTick(906)
                .turnNumber(3)
                .nextDiffSequence(7)
                .lastDiffServerTick(906)
                .state(GameSessionState.STARTED)
                .playerATankX(161.0)
                .playerATankY(420.0)
                .playerATankHealth(110.0)
                .playerATankFuel(99.0)
                .playerBTankX(800.0)
                .playerBTankY(420.0)
                .playerBTankHealth(46.0)
                .playerBTankFuel(100.0)
                .gameplayDefinitionVersion("online-gameplay-definitions.v1")
                .build();

        when(harness.gameRepository.findById(gameSessionId)).thenReturn(Optional.of(gameSession));

        boolean sent = harness.service.sendResyncStateToPlayer(
                gameSessionId,
                "host",
                OnlineDiffPayloads.ResyncReason.MISSED_DIFF
        );

        assertThat(sent).isTrue();

        List<OnlineDiffEnvelopeDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).hasSize(1);
        assertThat(diffs.get(0).type()).isEqualTo(OnlineStateDiffType.RESYNC_STATE);
        
        OnlineDiffPayloads.ResyncState resync = (OnlineDiffPayloads.ResyncState) diffs.get(0).payload();
        assertThat(resync.replacesSequence()).isEqualTo(6);
        assertThat(resync.reason()).isEqualTo(OnlineDiffPayloads.ResyncReason.MISSED_DIFF);
        assertThat(resync.state().tanks().get(0).position().x()).isEqualTo(161.0);
        assertThat(resync.state().tanks().get(1).health()).isEqualTo(46.0);
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
        private final UserSessionService userSessionService = mock(UserSessionService.class);
        private final LobbyRepository lobbyRepository = mock(LobbyRepository.class);
        private final QuickMatchService quickMatchService = mock(QuickMatchService.class);
        private final List<Object> events = new ArrayList<>();
        private final ApplicationEventPublisher eventPublisher = events::add;
        private final RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
        private final RedisClaimService redisClaimService = mock(RedisClaimService.class);
        private final GameResultRepository gameResultRepository = mock(GameResultRepository.class);
        private final UserRepository userRepository = mock(UserRepository.class);
        private final OnlineGameplayRules gameplayRules = new OnlineGameplayRules(new OnlineGameplayDefinitionCatalog());
        private final OnlineInitialStateFactory initialStateFactory = new OnlineInitialStateFactory(gameplayRules);
        private final GameSessionService service = new GameSessionService(
                gameRepository,
                userSessionService,
                lobbyRepository,
                quickMatchService,
                eventPublisher,
                redisTemplate,
                redisClaimService,
                gameplayRules,
                initialStateFactory,
                gameResultRepository,
                userRepository);
        private final ServerSimulationLoopService loopService = new ServerSimulationLoopService(
                gameRepository,
                eventPublisher,
                redisTemplate);
    }
}
