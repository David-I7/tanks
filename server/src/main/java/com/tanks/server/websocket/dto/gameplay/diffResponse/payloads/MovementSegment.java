package com.tanks.server.websocket.dto.gameplay.diffResponse.payloads;

import java.util.List;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponsePayload;
import lombok.Builder;

@Builder
public record MovementSegment(
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
        long durationTicks) implements OnlineDiffResponsePayload {
}
