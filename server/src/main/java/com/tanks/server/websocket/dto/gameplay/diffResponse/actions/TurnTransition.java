package com.tanks.server.websocket.dto.gameplay.diffResponse.actions;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponsePayload;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.TurnPhase;
import lombok.Builder;

@Builder
public record TurnTransition(
        long previousPlayerId,
        long activePlayerId,
        int turnNumber,
        TurnPhase phase,
        long turnEndsAtServerTick,
        Long matchEndsAtServerTick,
        double wind) implements OnlineDiffResponsePayload {
}
