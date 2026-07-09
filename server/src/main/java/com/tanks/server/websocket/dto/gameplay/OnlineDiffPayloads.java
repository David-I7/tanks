package com.tanks.server.websocket.dto.gameplay;

import java.util.List;

public final class OnlineDiffPayloads {

        private OnlineDiffPayloads() {
        }

        public record InitialState(OnlineGameStateSnapshotDto state) {
        }

        public record ResyncState(long replacesSequence, ResyncReason reason, OnlineGameStateSnapshotDto state) {
        }

        public record MovementSegment(
                        long playerId,
                        long tankEntityId,
                        OnlineVec2Dto from,
                        OnlineVec2Dto to,
                        long startedServerTick,
                        long endedServerTick) {
        }

        public record ProjectileResolution(
                        long projectileEntityId,
                        long ownerPlayerId,
                        String projectileDefinitionId,
                        String projectileRenderAssetId,
                        String impactRenderAssetId,
                        OnlineVec2Dto launch,
                        OnlineVec2Dto impact,
                        List<OnlineTankDamageDto> damagedTanks) {
        }

        public record TerrainPatch(List<OnlineTerrainPatchDto> patches) {
        }

        public record IntentRejection(
                        String rejectedIntentId,
                        long playerId,
                        IntentRejectionReason reason,
                        long authoritativeSequence,
                        long authoritativeServerTick) {
        }

        public record TurnTransition(
                        long previousPlayerId,
                        long activePlayerId,
                        int turnNumber,
                        TurnPhase phase,
                        long turnEndsAtServerTick) {
        }

        public record TerminalGame(
                        Long winnerPlayerId,
                        TerminalGameReason reason,
                        OnlineGameStateSnapshotDto finalState) {
        }

        public enum ResyncReason {
                MISSED_DIFF,
                SERVER_CORRECTION,
                RECONNECT
        }

        public enum IntentRejectionReason {
                STALE_BASE_STATE,
                NOT_ACTIVE_PLAYER,
                INVALID_PAYLOAD,
                TURN_ALREADY_RESOLVING
        }

        public enum TurnPhase {
                AIMING
        }

        public enum TerminalGameReason {
                LAST_TANK_STANDING,
                DRAW,
                FORFEIT
        }
}
