package com.tanks.server.websocket.dto.gameplay.diffResponse.actions;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponsePayload;
import lombok.Builder;

@Builder
public record CrateSpawned(
        String crateId,
        String crateType,
        double dropX,
        double targetY,
        Integer value) implements OnlineDiffResponsePayload {
}
