package com.tanks.server.websocket.dto.gameplay;

public record OnlineMatchSnapshotResponseDto(
                MatchPhase phase,
                long activePlayerId,
                int playerCount,
                int turnNumber,
                long turnTimeRemainingTicks,
                Long winnerPlayerId) {

        public enum MatchPhase {
                AIMING,
                BALLISTICS,
                IMPACT,
                TRANSITION,
                GAME_OVER
        }
}
