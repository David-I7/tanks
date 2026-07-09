package com.tanks.server.websocket.dto.gameplay;

public record OnlineDiffEnvelopeDto<TPayload>(
                String protocolVersion,
                String gameSessionId,
                long sequence,
                long serverTick,
                OnlineStateDiffType type,
                String intentId,
                TPayload payload) {
}
