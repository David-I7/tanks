package com.tanks.server.websocket.dto.gameplay.diffResponse.payloads;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponsePayload;
import lombok.Builder;

@Builder
public record AimUpdate(
        long playerId,
        double angle,
        double power) implements OnlineDiffResponsePayload {
}
