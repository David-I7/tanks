package com.tanks.server.websocket.dto.gameplay.diffResponse.payloads;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponsePayload;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.IntentRejectionReason;
import lombok.Builder;

@Builder
public record IntentRejection(
        long playerId,
        IntentRejectionReason reason,
        long authoritativeSequence,
        long authoritativeServerTick) implements OnlineDiffResponsePayload {
}
