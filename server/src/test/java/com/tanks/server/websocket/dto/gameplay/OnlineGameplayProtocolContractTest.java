package com.tanks.server.websocket.dto.gameplay;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads.IntentRejection;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads.IntentRejectionReason;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads.TurnPhase;
import com.tanks.server.websocket.dto.gameplay.OnlineIntentPayloads.Fire;
import com.tanks.server.websocket.dto.gameplay.OnlineMatchSnapshotDto.MatchPhase;
import com.tanks.server.websocket.dto.gameplay.OnlineTerrainSnapshotDto.TerrainSnapshotKind;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class OnlineGameplayProtocolContractTest {

        private final ObjectMapper objectMapper = new ObjectMapper();

        @Test
        @DisplayName("Player Intent envelope serializes the required contract fields")
        void playerIntentEnvelope() throws Exception {
                var intent = new OnlinePlayerIntentDto<>(
                                OnlineGameplayProtocolVersion.V1,
                                "game-123",
                                1,
                                "intent-abc",
                                7,
                                210,
                                OnlinePlayerIntentType.FIRE,
                                new Fire(42, 0.75, "standard"));

                JsonNode json = objectMapper.valueToTree(intent);

                assertThat(json.get("protocolVersion").asText()).isEqualTo("online-gameplay.v1");
                assertThat(json.get("gameSessionId").asText()).isEqualTo("game-123");
                assertThat(json.get("intentId").asText()).isEqualTo("intent-abc");
                assertThat(json.get("lastConfirmedDiffSequence").asLong()).isEqualTo(7);
                assertThat(json.get("lastConfirmedDiffServerTick").asLong()).isEqualTo(210);
                assertThat(json.get("type").asText()).isEqualTo("FIRE");
                assertThat(json.at("/payload/projectileSlotId").asText()).isEqualTo("standard");
        }

        @Test
        @DisplayName("State Diff envelope serializes the required contract fields")
        void stateDiffEnvelope() {
                var diff = new OnlineDiffEnvelopeDto<>(
                                OnlineGameplayProtocolVersion.V1,
                                "game-123",
                                8,
                                240,
                                OnlineStateDiffType.INTENT_REJECTION,
                                "intent-abc",
                                new IntentRejection(
                                                "intent-abc",
                                                1,
                                                IntentRejectionReason.STALE_BASE_STATE,
                                                9,
                                                270));

                JsonNode json = objectMapper.valueToTree(diff);

                assertThat(json.get("gameSessionId").asText()).isEqualTo("game-123");
                assertThat(json.get("sequence").asLong()).isEqualTo(8);
                assertThat(json.get("serverTick").asLong()).isEqualTo(240);
                assertThat(json.get("type").asText()).isEqualTo("INTENT_REJECTION");
                assertThat(json.get("intentId").asText()).isEqualTo("intent-abc");
                assertThat(json.at("/payload/reason").asText()).isEqualTo("STALE_BASE_STATE");
        }

        @Test
        @DisplayName("Projectile Resolution exposes render asset IDs without client asset paths")
        void projectileResolutionRenderAssetIds() {
                var diff = new OnlineDiffEnvelopeDto<>(
                                OnlineGameplayProtocolVersion.V1,
                                "game-123",
                                4,
                                90,
                                OnlineStateDiffType.PROJECTILE_RESOLUTION,
                                "intent-fire",
                                new OnlineDiffPayloads.ProjectileResolution(
                                                20,
                                                1,
                                                "basicShell",
                                                "projectile.basic-shell",
                                                "impact.orange-pop",
                                                new OnlineVec2Dto(55, 110),
                                                new OnlineVec2Dto(120, 130),
                                                List.of(new OnlineTankDamageDto(11, 2, 35, 65))));

                JsonNode json = objectMapper.valueToTree(diff);

                assertThat(json.at("/payload/projectileRenderAssetId").asText()).isEqualTo("projectile.basic-shell");
                assertThat(json.at("/payload/impactRenderAssetId").asText()).isEqualTo("impact.orange-pop");
                assertThat(json.at("/payload/projectileRenderAssetId").asText()).doesNotContain("/", "\\");
                assertThat(json.at("/payload/impactRenderAssetId").asText()).doesNotContain("/", "\\");
        }

        @Test
        @DisplayName("Protocol covers every authoritative diff shape")
        void diffShapes() {
                var state = stateSnapshot();

                List<OnlineDiffEnvelopeDto<?>> diffs = List.of(
                                new OnlineDiffEnvelopeDto<>(
                                                OnlineGameplayProtocolVersion.V1,
                                                "game-123",
                                                1,
                                                0,
                                                OnlineStateDiffType.INITIAL_STATE,
                                                null,
                                                new OnlineDiffPayloads.InitialState(2, state)),
                                new OnlineDiffEnvelopeDto<>(
                                                OnlineGameplayProtocolVersion.V1,
                                                "game-123",
                                                2,
                                                30,
                                                OnlineStateDiffType.RESYNC_STATE,
                                                null,
                                                new OnlineDiffPayloads.ResyncState(
                                                                1,
                                                                OnlineDiffPayloads.ResyncReason.MISSED_DIFF,
                                                                state)),
                                new OnlineDiffEnvelopeDto<>(
                                                OnlineGameplayProtocolVersion.V1,
                                                "game-123",
                                                3,
                                                60,
                                                OnlineStateDiffType.MOVEMENT_SEGMENT,
                                                "intent-move",
                                                new OnlineDiffPayloads.MovementSegment(
                                                                1,
                                                                10,
                                                                new OnlineVec2Dto(50, 120),
                                                                new OnlineVec2Dto(55, 120),
                                                                60,
                                                                75)),
                                new OnlineDiffEnvelopeDto<>(
                                                OnlineGameplayProtocolVersion.V1,
                                                "game-123",
                                                4,
                                                90,
                                                OnlineStateDiffType.PROJECTILE_RESOLUTION,
                                                "intent-fire",
                                                new OnlineDiffPayloads.ProjectileResolution(
                                                                20,
                                                                1,
                                                                "basicShell",
                                                                "projectile.basic-shell",
                                                                "impact.orange-pop",
                                                                new OnlineVec2Dto(55, 110),
                                                                new OnlineVec2Dto(120, 130),
                                                                List.of(new OnlineTankDamageDto(11, 2, 35, 65)))),
                                new OnlineDiffEnvelopeDto<>(
                                                OnlineGameplayProtocolVersion.V1,
                                                "game-123",
                                                5,
                                                90,
                                                OnlineStateDiffType.TERRAIN_PATCH,
                                                null,
                                                new OnlineDiffPayloads.TerrainPatch(List.of(
                                                                new OnlineTerrainPatchDto.HeightmapRange(
                                                                                OnlineTerrainPatchDto.TerrainPatchKind
                                                                                                .HEIGHTMAP_RANGE,
                                                                                2,
                                                                                List.of(1, 1, 2))))),
                                new OnlineDiffEnvelopeDto<>(
                                                OnlineGameplayProtocolVersion.V1,
                                                "game-123",
                                                6,
                                                120,
                                                OnlineStateDiffType.INTENT_REJECTION,
                                                "intent-stale",
                                                new IntentRejection(
                                                                "intent-stale",
                                                                1,
                                                                IntentRejectionReason.STALE_BASE_STATE,
                                                                6,
                                                                120)),
                                new OnlineDiffEnvelopeDto<>(
                                                OnlineGameplayProtocolVersion.V1,
                                                "game-123",
                                                7,
                                                150,
                                                OnlineStateDiffType.TURN_TRANSITION,
                                                null,
                                                new OnlineDiffPayloads.TurnTransition(1, 2, 2, TurnPhase.AIMING, 1050)),
                                new OnlineDiffEnvelopeDto<>(
                                                OnlineGameplayProtocolVersion.V1,
                                                "game-123",
                                                8,
                                                180,
                                                OnlineStateDiffType.TERMINAL_GAME,
                                                null,
                                                new OnlineDiffPayloads.TerminalGame(
                                                                1L,
                                                                OnlineDiffPayloads.TerminalGameReason.LAST_TANK_STANDING,
                                                                state)));

                assertThat(diffs)
                                .extracting(OnlineDiffEnvelopeDto::type)
                                .containsExactly(
                                                OnlineStateDiffType.INITIAL_STATE,
                                                OnlineStateDiffType.RESYNC_STATE,
                                                OnlineStateDiffType.MOVEMENT_SEGMENT,
                                                OnlineStateDiffType.PROJECTILE_RESOLUTION,
                                                OnlineStateDiffType.TERRAIN_PATCH,
                                                OnlineStateDiffType.INTENT_REJECTION,
                                                OnlineStateDiffType.TURN_TRANSITION,
                                                OnlineStateDiffType.TERMINAL_GAME);
        }

        @Test
        @DisplayName("Shared examples match server serialization")
        void sharedExamples() throws Exception {
                JsonNode expected = objectMapper.readTree(Path.of("..", "docs", "contracts",
                                "online-gameplay-protocol-examples.json").toFile());

                JsonNode actual = objectMapper.valueToTree(new OnlineGameplayProtocolFixture(
                                playerIntentFixture(),
                                List.of(initialStateFixture(), intentRejectionFixture())));

                assertThat(actual.toString()).isEqualTo(expected.toString());
        }

        private static OnlineGameStateSnapshotDto stateSnapshot() {
                return new OnlineGameStateSnapshotDto(
                                "online-gameplay-definitions.v1",
                                new OnlineMatchSnapshotDto(MatchPhase.AIMING, 1, 2, 1, 900, null),
                                new OnlineTerrainSnapshotDto.Heightmap(TerrainSnapshotKind.HEIGHTMAP, 4, 3,
                                                List.of(2, 2, 1, 2)),
                                List.of(new OnlineTankSnapshotDto(
                                                10,
                                                1,
                                                "Player 1",
                                                "vanguard",
                                                "tank.vanguard",
                                                new OnlineVec2Dto(50, 120),
                                                1,
                                                45,
                                                0.5,
                                                "standard",
                                                List.of(new OnlineProjectileSlotSnapshotDto(
                                                                "standard",
                                                                "basicShell",
                                                                "Std",
                                                                "projectile-slot.standard")),
                                                110,
                                                110,
                                                100,
                                                true)),
                                List.of());
        }

        private static OnlinePlayerIntentDto<Fire> playerIntentFixture() {
                return new OnlinePlayerIntentDto<>(
                                OnlineGameplayProtocolVersion.V1,
                                "game-123",
                                1,
                                "intent-abc",
                                7,
                                210,
                                OnlinePlayerIntentType.FIRE,
                                new Fire(42, 0.75, "standard"));
        }

        private static OnlineDiffEnvelopeDto<OnlineDiffPayloads.InitialState> initialStateFixture() {
                return new OnlineDiffEnvelopeDto<>(
                                OnlineGameplayProtocolVersion.V1,
                                "game-123",
                                1,
                                0,
                                OnlineStateDiffType.INITIAL_STATE,
                                null,
                                new OnlineDiffPayloads.InitialState(2, stateSnapshot()));
        }

        private static OnlineDiffEnvelopeDto<IntentRejection> intentRejectionFixture() {
                return new OnlineDiffEnvelopeDto<>(
                                OnlineGameplayProtocolVersion.V1,
                                "game-123",
                                8,
                                240,
                                OnlineStateDiffType.INTENT_REJECTION,
                                "intent-abc",
                                new IntentRejection(
                                                "intent-abc",
                                                1,
                                                IntentRejectionReason.STALE_BASE_STATE,
                                                9,
                                                270));
        }

        private record OnlineGameplayProtocolFixture(
                        OnlinePlayerIntentDto<Fire> playerIntent,
                        List<OnlineDiffEnvelopeDto<?>> diffs) {
        }
}
