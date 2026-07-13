package com.tanks.server.websocket.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

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

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class GoldenSimulationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UUID gameSessionId = UUID.fromString("00000000-0000-0000-0000-000000000123");

    private GameSession parseInitialState(String scenarioName) throws Exception {
        Path path = Path.of("../docs/contracts/tanks-golden-simulation-scenarios.json");
        JsonNode root = objectMapper.readTree(path.toFile());
        for (JsonNode scenario : root) {
            if (scenario.get("name").asText().equals(scenarioName)) {
                JsonNode state = scenario.get("initialState");
                JsonNode match = state.get("match");
                JsonNode tanks = state.get("tanks");
                JsonNode tankA = tanks.get(0);
                JsonNode tankB = tanks.get(1);

                // Default nextDiffSequence to 2, or 7 for resync scenario
                long nextSeq = scenarioName.equals("resync") ? 7 : 2;
                long lastTick = scenarioName.equals("resync") ? 906 : 0;
                long serverTick = scenarioName.equals("resync") ? 906 : 0;

                return GameSession.builder()
                        .id(gameSessionId)
                        .playerA(scenario.get("playerA").asText())
                        .playerB(scenario.get("playerB").asText())
                        .playerTurn(match.get("activePlayerId").asInt() == 1 ? scenario.get("playerA").asText() : scenario.get("playerB").asText())
                        .playerTurnExpiresAt(match.get("turnTimeRemainingTicks").asLong())
                        .serverTick(serverTick)
                        .turnNumber(match.get("turnNumber").asInt())
                        .nextDiffSequence(nextSeq)
                        .lastDiffServerTick(lastTick)
                        .state(GameSessionState.STARTED)
                        .playerATankX(tankA.get("position").get("x").asDouble())
                        .playerATankY(tankA.get("position").get("y").asDouble())
                        .playerATankHealth(tankA.get("health").asDouble())
                        .playerATankFuel(tankA.get("fuel").asDouble())
                        .playerBTankX(tankB.get("position").get("x").asDouble())
                        .playerBTankY(tankB.get("position").get("y").asDouble())
                        .playerBTankHealth(tankB.get("health").asDouble())
                        .playerBTankFuel(tankB.get("fuel").asDouble())
                        .gameplayDefinitionVersion(state.get("gameplayDefinitionVersion").asText())
                        .build();
            }
        }
        throw new IllegalArgumentException("Scenario not found: " + scenarioName);
    }

    @Test
    @DisplayName("Golden simulation case: Movement")
    void movementScenario() throws Exception {
        TestHarness harness = new TestHarness();
        GameSession gameSession = parseInitialState("movement");

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
        GameSession gameSession = parseInitialState("projectile_impact");

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

        OnlineDiffPayloads.ProjectileResolution resolution = (OnlineDiffPayloads.ProjectileResolution) diffs.get(0).payload();
        assertThat(resolution.impact().x()).isEqualTo(795.23);
        assertThat(resolution.impact().y()).isEqualTo(423.56);
        assertThat(resolution.trajectory()).hasSize(21);

        // Check state updates
        assertThat(gameSession.getPlayerBTankHealth()).isEqualTo(46.0);
        assertThat(gameSession.getPlayerTurn()).isEqualTo("opponent");
        assertThat(gameSession.getTurnNumber()).isEqualTo(2);
    }

    @Test
    @DisplayName("Golden simulation case: Turn timeout, no-shot advance, disconnect continuation")
    void turnTimeoutScenario() throws Exception {
        TestHarness harness = new TestHarness();
        GameSession gameSession = parseInitialState("turn_timeout");

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
        GameSession gameSession = parseInitialState("resync");

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

    @Test
    @DisplayName("Golden simulation case: Disconnect continuation")
    void disconnectContinuationScenario() throws Exception {
        TestHarness harness = new TestHarness();
        GameSession gameSession = parseInitialState("disconnect_continuation");

        when(harness.gameRepository.findById(gameSessionId)).thenReturn(Optional.of(gameSession));
        when(harness.gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        int initialCount = gameSession.getConnectedPlayerCount();

        // Player 2 disconnects
        harness.service.decremenentPlayerCount(gameSessionId);

        // Verify connectedPlayerCount was decremented
        assertThat(gameSession.getConnectedPlayerCount()).isEqualTo(initialCount - 1);

        // Let turn expire for Player 1 (who is still connected)
        gameSession.setServerTick(900);
        harness.loopService.advance(gameSession);

        // Check turn transition occurred normally (game continues)
        List<OnlineDiffEnvelopeDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).hasSize(1);
        assertThat(diffs.get(0).type()).isEqualTo(OnlineStateDiffType.TURN_TRANSITION);

        assertThat(gameSession.getPlayerTurn()).isEqualTo("opponent");
        assertThat(gameSession.getTurnNumber()).isEqualTo(2);
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
        private final ClaimService claimService = mock(ClaimService.class);
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
                claimService,
                gameplayRules,
                initialStateFactory,
                gameResultRepository,
                userRepository,
                new KeyLockManager());
        private final ServerSimulationLoopService loopService = new ServerSimulationLoopService(
                gameRepository,
                eventPublisher);
    }
}
