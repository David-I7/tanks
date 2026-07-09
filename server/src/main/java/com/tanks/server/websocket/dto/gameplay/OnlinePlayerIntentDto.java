package com.tanks.server.websocket.dto.gameplay;

public record OnlinePlayerIntentDto<TPayload>(
                String protocolVersion,
                String gameSessionId,
                long playerId,
                String intentId,
                long lastConfirmedDiffSequence,
                long lastConfirmedDiffServerTick,
                OnlinePlayerIntentType type,
                TPayload payload) {
}
