package com.tanks.server.websocket.dto.gameplay;

import lombok.Builder;

@Builder

public record OnlinePlayerIntentRequestDto<TPayload>(
                String protocolVersion,
                String gameSessionId,
                long playerId,
                String intentId,
                long lastConfirmedDiffSequence,
                long lastConfirmedDiffServerTick,
                OnlinePlayerIntentRequestType type,
                TPayload payload) {
}
