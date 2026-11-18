package com.tanks.server.websocket.dto.gameplay.match;

import com.tanks.server.websocket.dto.gameplay.match.phases.MatchPhase;
import lombok.Builder;

@Builder
public record OnlineMatchSnapshotResponseDto(
        MatchPhase phase,
        long activePlayerId,
        int playerCount,
        int turnNumber,
        long turnTimeRemainingTicks,
        Long winnerPlayerId,
        Long matchEndsAtServerTick,
        Double wind,
        String biome) {
}
