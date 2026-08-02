package com.tanks.server.websocket.dto.gameplay.diffResponse;

import lombok.Builder;

@Builder
public record OnlineDiffResponseDto(
        String protocolVersion,
        String gameSessionId,
        long sequence,
        long serverTick,
        OnlineStateDiffResponseType type,
        String intentId,
        OnlineDiffResponsePayload payload) {
}
