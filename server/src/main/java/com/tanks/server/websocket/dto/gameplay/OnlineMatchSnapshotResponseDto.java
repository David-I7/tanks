package com.tanks.server.websocket.dto.gameplay;

import lombok.Builder;

@Builder

public record OnlineMatchSnapshotResponseDto(
                MatchPhase phase,
                long activePlayerId,
                int playerCount,
                int turnNumber,
                long turnTimeRemainingTicks,
                Long winnerPlayerId,
                Long matchEndsAtServerTick) {

        public OnlineMatchSnapshotResponseDto(
                        MatchPhase phase,
                        long activePlayerId,
                        int playerCount,
                        int turnNumber,
                        long turnTimeRemainingTicks,
                        Long winnerPlayerId) {
                this(phase, activePlayerId, playerCount, turnNumber, turnTimeRemainingTicks, winnerPlayerId, null);
        }

        public enum MatchPhase {
                AIMING,
                BALLISTICS,
                IMPACT,
                TRANSITION,
                GAME_OVER
        }
}
