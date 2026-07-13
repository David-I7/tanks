package com.tanks.server.websocket.dto.gameplay;

import java.util.List;

public final class OnlineDiffResponsePayloads {

        private OnlineDiffResponsePayloads() {
        }

        public record InitialState(long expectedNextDiffSequence, long localPlayerId, OnlineGameStateSnapshotResponseDto state) {
        }

        public record ResyncState(long replacesSequence, ResyncReason reason, long localPlayerId, OnlineGameStateSnapshotResponseDto state) {
        }

        public record MovementSegment(
                        String intentId,
                        long playerId,
                        long tankEntityId,
                        OnlineVec2Dto from,
                        OnlineVec2Dto to,
                        List<OnlineVec2Dto> movementPath,
                        int fuelBefore,
                        int fuelAfter,
                        int fuelSpent,
                        boolean partial,
                        long startedServerTick,
                        long endedServerTick,
                        long durationTicks) {
        }

        public record ProjectileResolution(
                        String intentId,
                        long projectileEntityId,
                        long ownerPlayerId,
                        String projectileDefinitionId,
                        String projectileRenderAssetId,
                        String impactRenderAssetId,
                        OnlineVec2Dto launch,
                        List<OnlineVec2Dto> trajectory,
                        OnlineVec2Dto impact,
                        List<OnlineTankDamageResponseDto> damagedTanks) {
        }

        public record TerrainPatch(List<OnlineTerrainPatchResponseDto> patches) {
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
                        OnlineGameStateSnapshotResponseDto finalState) {
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
                TURN_ALREADY_RESOLVING,
                INSUFFICIENT_FUEL,
                OUT_OF_BOUNDS,
                IMPASSABLE_TERRAIN
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
