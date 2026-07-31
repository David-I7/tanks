package com.tanks.server.websocket.dto.gameplay;

import lombok.Builder;

@Builder

public record OnlineDiffResponseDto<TPayload>(
                String protocolVersion,
                String gameSessionId,
                long sequence,
                long serverTick,
                OnlineStateDiffResponseType type,
                String intentId,
                TPayload payload) {
}
