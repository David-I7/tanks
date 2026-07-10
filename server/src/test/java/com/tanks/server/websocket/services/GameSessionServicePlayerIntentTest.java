package com.tanks.server.websocket.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;

import com.tanks.server.websocket.dto.gameplay.OnlineDiffEnvelopeDto;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads.IntentRejectionReason;
import com.tanks.server.websocket.dto.gameplay.OnlineGameplayProtocolVersion;
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

class GameSessionServicePlayerIntentTest {

    @Test
    @DisplayName("Active move intent with current diff context emits a Movement Segment diff")
    void acceptsCurrentActivePlayerIntent() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));
        when(harness.gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        boolean accepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                moveIntent(gameSession, 1, "move-1", 1, 0));

        assertThat(accepted).isTrue();
        assertThat(gameSession.getPlayerAUnresolvedIntentId()).isNull();
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(3);
        assertThat(gameSession.getLastDiffServerTick()).isEqualTo(OnlineGameplayRules.MOVEMENT_SEGMENT_DURATION_TICKS);
        assertThat(gameSession.getPlayerATankX()).isEqualTo(161);
        assertThat(gameSession.getPlayerATankFuel()).isEqualTo(99);
        assertMovementSegment(
                harness,
                "move-1",
                1,
                2,
                OnlineGameplayRules.MOVEMENT_SEGMENT_DURATION_TICKS,
                0,
                160,
                161,
                100,
                99);
        verify(harness.gameRepository).save(gameSession);
    }

    @Test
    @DisplayName("Inactive player intent is rejected with a sequenced Intent Rejection Diff")
    void rejectsInactivePlayerIntent() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));

        boolean accepted = harness.service.acceptPlayerIntent(
                "opponent",
                gameSession.getId(),
                moveIntent(gameSession, 2, "move-2", 1, 0));

        assertThat(accepted).isFalse();
        assertRejection(harness, gameSession, "move-2", 2, IntentRejectionReason.NOT_ACTIVE_PLAYER, 2, 0);
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(3);
        assertThat(gameSession.getLastDiffServerTick()).isZero();
        assertThat(gameSession.getPlayerBUnresolvedIntentId()).isNull();
    }

    @Test
    @DisplayName("Player intent sender must match the declared active player")
    void rejectsSpoofedActivePlayerIntent() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));

        boolean accepted = harness.service.acceptPlayerIntent(
                "opponent",
                gameSession.getId(),
                moveIntent(gameSession, 1, "spoofed-move", 1, 0));

        assertThat(accepted).isFalse();
        assertRejection(harness, gameSession, "spoofed-move", 1, IntentRejectionReason.NOT_ACTIVE_PLAYER, 2, 0);
        assertThat(gameSession.getPlayerAUnresolvedIntentId()).isNull();
    }

    @Test
    @DisplayName("Stale diff sequence or server tick context is rejected by default")
    void rejectsStaleIntentContext() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setNextDiffSequence(5);
        gameSession.setServerTick(90);
        gameSession.setLastDiffServerTick(60);
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));

        boolean accepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                moveIntent(gameSession, 1, "stale-move", 3, 60));

        assertThat(accepted).isFalse();
        assertRejection(harness, gameSession, "stale-move", 1, IntentRejectionReason.STALE_BASE_STATE, 5, 90);
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(6);
        assertThat(gameSession.getLastDiffServerTick()).isEqualTo(90);
        assertThat(gameSession.getPlayerAUnresolvedIntentId()).isNull();
    }

    @Test
    @DisplayName("Rejected player intents are emitted in monotonically increasing order per Game Session")
    void rejectedPlayerIntentsAreOrderedPerGameSession() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setNextDiffSequence(5);
        gameSession.setServerTick(90);
        gameSession.setLastDiffServerTick(60);
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));

        boolean firstAccepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                moveIntent(gameSession, 1, "stale-move-1", 3, 60));
        boolean secondAccepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                moveIntent(gameSession, 1, "stale-move-2", 4, 60));

        assertThat(firstAccepted).isFalse();
        assertThat(secondAccepted).isFalse();
        assertThat(gameplayDiffs(harness))
                .extracting(OnlineDiffEnvelopeDto::sequence)
                .containsExactly(5L, 6L);
        assertThat(gameplayDiffs(harness))
                .extracting(OnlineDiffEnvelopeDto::serverTick)
                .containsExactly(90L, 90L);
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(7);
        assertThat(gameSession.getLastDiffServerTick()).isEqualTo(90);
    }

    @Test
    @DisplayName("Current diff context is not stale only because server ticks advanced without a diff")
    void acceptsIntentWhenOnlyServerTickAdvanced() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setServerTick(30);
        gameSession.setLastDiffServerTick(0);
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));

        boolean accepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                moveIntent(gameSession, 1, "move-1", 1, 0));

        assertThat(accepted).isTrue();
        assertThat(gameSession.getPlayerAUnresolvedIntentId()).isNull();
        assertThat(gameplayDiffs(harness)).hasSize(1);
    }

    @Test
    @DisplayName("Movement intent without enough fuel is rejected and clears the matching Pending Prediction")
    void rejectsMovementWithoutEnoughFuel() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setPlayerATankFuel(0.0);
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));

        boolean accepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                moveIntent(gameSession, 1, "empty-tank-move", 1, 0));

        assertThat(accepted).isFalse();
        assertRejection(
                harness,
                gameSession,
                "empty-tank-move",
                1,
                IntentRejectionReason.INSUFFICIENT_FUEL,
                2,
                0);
        assertThat(gameSession.getPlayerATankFuel()).isZero();
        assertThat(gameSession.getPlayerATankX()).isEqualTo(160);
    }

    @Test
    @DisplayName("Movement intent that would leave world bounds is rejected and clears the matching Pending Prediction")
    void rejectsMovementOutsideWorldBounds() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setPlayerATankX(960.0);
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));

        boolean accepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                moveIntent(gameSession, 1, "bounds-move", 1, 0));

        assertThat(accepted).isFalse();
        assertRejection(
                harness,
                gameSession,
                "bounds-move",
                1,
                IntentRejectionReason.OUT_OF_BOUNDS,
                2,
                0);
        assertThat(gameSession.getPlayerATankX()).isEqualTo(960);
        assertThat(gameSession.getPlayerATankFuel()).isEqualTo(100);
    }

    @Test
    @DisplayName("A player cannot submit a second intent while one unresolved intent is tracked")
    void enforcesOneUnresolvedIntentPerPlayer() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setPlayerAUnresolvedIntentId("move-1");
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));

        boolean accepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                moveIntent(gameSession, 1, "move-2", 1, 0));

        assertThat(accepted).isFalse();
        assertRejection(harness, gameSession, "move-2", 1, IntentRejectionReason.TURN_ALREADY_RESOLVING, 2, 0);
        assertThat(gameSession.getPlayerAUnresolvedIntentId()).isEqualTo("move-1");
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(3);
    }

    @Test
    @DisplayName("Standalone aim intents are invalid because aim remains local until fire")
    void rejectsStandaloneAimWithoutPredictionDiff() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));

        boolean accepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                aimIntent(gameSession, 1, "aim-1", 1, 0));

        assertThat(accepted).isFalse();
        assertThat(gameSession.getPlayerAUnresolvedIntentId()).isNull();
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(2);
        assertThat(gameplayDiffs(harness)).isEmpty();
    }

    @Test
    @DisplayName("Fire intent resolves projectile trajectory, impact, terrain, damage, and next turn diffs")
    void fireIntentResolvesProjectileTerrainDamageAndTurn() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));
        when(harness.gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        boolean accepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                fireIntent(gameSession, 1, "fire-1", 1, 0, 7, 0.96, "standard"));

        assertThat(accepted).isTrue();
        assertThat(gameSession.getPlayerAUnresolvedIntentId()).isNull();
        assertThat(gameSession.getPlayerTurn()).isEqualTo("opponent");
        assertThat(gameSession.getTurnNumber()).isEqualTo(2);
        assertThat(gameSession.getPlayerBTankHealth()).isEqualTo(46);
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(5);
        assertThat(gameSession.getLastDiffServerTick()).isEqualTo(0);

        List<OnlineDiffEnvelopeDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::type).containsExactly(
                OnlineStateDiffType.PROJECTILE_RESOLUTION,
                OnlineStateDiffType.TERRAIN_PATCH,
                OnlineStateDiffType.TURN_TRANSITION);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::sequence).containsExactly(2L, 3L, 4L);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::intentId).containsExactly("fire-1", "fire-1", "fire-1");

        OnlineDiffPayloads.ProjectileResolution projectile =
                (OnlineDiffPayloads.ProjectileResolution) diffs.get(0).payload();
        assertThat(projectile.intentId()).isEqualTo("fire-1");
        assertThat(projectile.projectileEntityId()).isEqualTo(20);
        assertThat(projectile.projectileDefinitionId()).isEqualTo("basicShell");
        assertThat(projectile.launch()).isEqualTo(new com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto(160, 396));
        assertThat(projectile.impact().x()).isBetween(760.0, 840.0);
        assertThat(projectile.impact().y()).isBetween(380.0, 460.0);
        assertThat(projectile.trajectory()).hasSizeGreaterThanOrEqualTo(3);
        assertThat(projectile.trajectory().getFirst()).isEqualTo(projectile.launch());
        assertThat(projectile.trajectory().getLast()).isEqualTo(projectile.impact());
        assertThat(projectile.damagedTanks()).containsExactly(
                new com.tanks.server.websocket.dto.gameplay.OnlineTankDamageDto(11, 2, 48, 46));

        OnlineDiffPayloads.TerrainPatch terrain = (OnlineDiffPayloads.TerrainPatch) diffs.get(1).payload();
        assertThat(terrain.patches()).hasSize(1);
        assertThat(terrain.patches().getFirst().kind())
                .isEqualTo(com.tanks.server.websocket.dto.gameplay.OnlineTerrainPatchDto.TerrainPatchKind.HEIGHTMAP_RANGE);

        OnlineDiffPayloads.TurnTransition turn = (OnlineDiffPayloads.TurnTransition) diffs.get(2).payload();
        assertThat(turn.previousPlayerId()).isEqualTo(1);
        assertThat(turn.activePlayerId()).isEqualTo(2);
        assertThat(turn.turnNumber()).isEqualTo(2);
        assertThat(turn.turnEndsAtServerTick()).isEqualTo(ServerSimulationLoopService.TURN_TIMER_TICKS);
    }

    @Test
    @DisplayName("Valid fire intent that misses still emits projectile, terrain, and turn diffs without damage")
    void fireIntentMissDoesNotDamageTarget() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));
        when(harness.gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        boolean accepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                fireIntent(gameSession, 1, "miss-1", 1, 0, 80, 0.4, "standard"));

        assertThat(accepted).isTrue();
        assertThat(gameSession.getPlayerBTankHealth()).isEqualTo(94);

        List<OnlineDiffEnvelopeDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::type).containsExactly(
                OnlineStateDiffType.PROJECTILE_RESOLUTION,
                OnlineStateDiffType.TERRAIN_PATCH,
                OnlineStateDiffType.TURN_TRANSITION);

        OnlineDiffPayloads.ProjectileResolution projectile =
                (OnlineDiffPayloads.ProjectileResolution) diffs.getFirst().payload();
        assertThat(projectile.damagedTanks()).isEmpty();
        assertThat(projectile.impact()).isNotEqualTo(new com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto(800, 420));
    }

    @Test
    @DisplayName("Terminal projectile damage emits a game-over diff after the authoritative turn diffs")
    void terminalFireIntentEmitsGameOverDiff() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setPlayerBTankHealth(30.0);
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));
        when(harness.gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        boolean accepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                fireIntent(gameSession, 1, "finisher", 1, 0, 7, 0.96, "standard"));

        assertThat(accepted).isTrue();
        assertThat(gameSession.getState()).isEqualTo(GameSessionState.ENDED);
        assertThat(gameSession.getPlayerBTankHealth()).isZero();

        List<OnlineDiffEnvelopeDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::type).containsExactly(
                OnlineStateDiffType.PROJECTILE_RESOLUTION,
                OnlineStateDiffType.TERRAIN_PATCH,
                OnlineStateDiffType.TURN_TRANSITION,
                OnlineStateDiffType.TERMINAL_GAME);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::sequence).containsExactly(2L, 3L, 4L, 5L);

        OnlineDiffPayloads.TerminalGame terminal = (OnlineDiffPayloads.TerminalGame) diffs.get(3).payload();
        assertThat(terminal.winnerPlayerId()).isEqualTo(1L);
        assertThat(terminal.reason()).isEqualTo(OnlineDiffPayloads.TerminalGameReason.LAST_TANK_STANDING);
        assertThat(terminal.finalState().match().phase())
                .isEqualTo(com.tanks.server.websocket.dto.gameplay.OnlineMatchSnapshotDto.MatchPhase.GAME_OVER);
        assertThat(terminal.finalState().match().winnerPlayerId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Fire intent with an unknown projectile slot is rejected as an invalid payload")
    void rejectsInvalidFireIntentWithoutPredictionDiff() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));

        boolean accepted = harness.service.acceptPlayerIntent(
                "host",
                gameSession.getId(),
                fireIntent(gameSession, 1, "bad-fire", 1, 0, 18, 1, "missing-slot"));

        assertThat(accepted).isFalse();
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(2);
        assertThat(gameplayDiffs(harness)).isEmpty();
    }

    @Test
    @DisplayName("Null intents are invalid payloads without sequenced rejection diffs")
    void rejectsNullIntentWithoutPredictionDiff() {
        TestHarness harness = new TestHarness();

        boolean accepted = harness.service.acceptPlayerIntent("host", UUID.randomUUID(), null);

        assertThat(accepted).isFalse();
        assertThat(gameplayDiffs(harness)).isEmpty();
    }

    @Test
    @DisplayName("Resolved player intent clears the player's unresolved intent slot")
    void resolvedIntentClearsUnresolvedIntentSlot() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setPlayerAUnresolvedIntentId("move-1");
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));
        when(harness.gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        boolean resolved = harness.service.resolvePlayerIntent(gameSession.getId(), 1, "move-1");

        assertThat(resolved).isTrue();
        assertThat(gameSession.getPlayerAUnresolvedIntentId()).isNull();
        verify(harness.gameRepository).save(gameSession);
    }

    @Test
    @DisplayName("Resolving a different intent leaves the unresolved intent slot unchanged")
    void mismatchedResolvedIntentDoesNotClearUnresolvedIntentSlot() {
        TestHarness harness = new TestHarness();
        GameSession gameSession = startedGameSession();
        gameSession.setPlayerAUnresolvedIntentId("move-1");
        when(harness.gameRepository.findById(gameSession.getId())).thenReturn(Optional.of(gameSession));

        boolean resolved = harness.service.resolvePlayerIntent(gameSession.getId(), 1, "move-2");

        assertThat(resolved).isFalse();
        assertThat(gameSession.getPlayerAUnresolvedIntentId()).isEqualTo("move-1");
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

    private static OnlinePlayerIntentDto<OnlineIntentPayloads.Move> moveIntent(
            GameSession gameSession,
            long playerId,
            String intentId,
            long lastConfirmedDiffSequence,
            long lastConfirmedDiffServerTick) {
        return new OnlinePlayerIntentDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                playerId,
                intentId,
                lastConfirmedDiffSequence,
                lastConfirmedDiffServerTick,
                OnlinePlayerIntentType.MOVE,
                new OnlineIntentPayloads.Move(1));
    }

    private static OnlinePlayerIntentDto<OnlineIntentPayloads.Aim> aimIntent(
            GameSession gameSession,
            long playerId,
            String intentId,
            long lastConfirmedDiffSequence,
            long lastConfirmedDiffServerTick) {
        return new OnlinePlayerIntentDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                playerId,
                intentId,
                lastConfirmedDiffSequence,
                lastConfirmedDiffServerTick,
                OnlinePlayerIntentType.AIM,
                new OnlineIntentPayloads.Aim(42, 0.5));
    }

    private static OnlinePlayerIntentDto<OnlineIntentPayloads.Fire> fireIntent(
            GameSession gameSession,
            long playerId,
            String intentId,
            long lastConfirmedDiffSequence,
            long lastConfirmedDiffServerTick,
            double angle,
            double power,
            String projectileSlotId) {
        return new OnlinePlayerIntentDto<>(
                OnlineGameplayProtocolVersion.V1,
                gameSession.getId().toString(),
                playerId,
                intentId,
                lastConfirmedDiffSequence,
                lastConfirmedDiffServerTick,
                OnlinePlayerIntentType.FIRE,
                new OnlineIntentPayloads.Fire(angle, power, projectileSlotId));
    }

    private static void assertRejection(
            TestHarness harness,
            GameSession gameSession,
            String intentId,
            long playerId,
            IntentRejectionReason reason,
            long sequence,
            long serverTick) {
        List<OnlineDiffEnvelopeDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).hasSize(1);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::type)
                .containsExactly(OnlineStateDiffType.INTENT_REJECTION);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::sequence).containsExactly(sequence);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::serverTick).containsExactly(serverTick);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::intentId).containsExactly(intentId);

        OnlineDiffPayloads.IntentRejection payload = (OnlineDiffPayloads.IntentRejection) diffs.getFirst().payload();
        assertThat(payload.rejectedIntentId()).isEqualTo(intentId);
        assertThat(payload.playerId()).isEqualTo(playerId);
        assertThat(payload.reason()).isEqualTo(reason);
        assertThat(payload.authoritativeSequence()).isEqualTo(gameSession.getNextDiffSequence());
        assertThat(payload.authoritativeServerTick()).isEqualTo(gameSession.getServerTick());
    }

    private static void assertMovementSegment(
            TestHarness harness,
            String intentId,
            long playerId,
            long sequence,
            long diffServerTick,
            long startedServerTick,
            double fromX,
            double toX,
            double fuelBefore,
            double fuelAfter) {
        List<OnlineDiffEnvelopeDto<?>> diffs = gameplayDiffs(harness);
        assertThat(diffs).hasSize(1);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::type)
                .containsExactly(OnlineStateDiffType.MOVEMENT_SEGMENT);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::sequence).containsExactly(sequence);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::serverTick).containsExactly(diffServerTick);
        assertThat(diffs).extracting(OnlineDiffEnvelopeDto::intentId).containsExactly(intentId);

        OnlineDiffPayloads.MovementSegment payload = (OnlineDiffPayloads.MovementSegment) diffs.getFirst().payload();
        assertThat(payload.intentId()).isEqualTo(intentId);
        assertThat(payload.playerId()).isEqualTo(playerId);
        assertThat(payload.tankEntityId()).isEqualTo(10);
        assertThat(payload.from().x()).isEqualTo(fromX);
        assertThat(payload.to().x()).isEqualTo(toX);
        assertThat(payload.fuelBefore()).isEqualTo(fuelBefore);
        assertThat(payload.fuelAfter()).isEqualTo(fuelAfter);
        assertThat(payload.fuelSpent()).isEqualTo(fuelBefore - fuelAfter);
        assertThat(payload.startedServerTick()).isEqualTo(startedServerTick);
        assertThat(payload.endedServerTick()).isEqualTo(diffServerTick);
        assertThat(payload.durationTicks()).isEqualTo(OnlineGameplayRules.MOVEMENT_SEGMENT_DURATION_TICKS);
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
                initialStateFactory);
    }
}
