package com.tanks.server.websocket.dto.gameplay.playerIntent;

import lombok.Builder;

@Builder
public record OnlinePlayerIntentRequestDto<OnlinePlayerIntentRequestPayload>(
                String gameSessionId,
                long playerId,
                String intentId,
                long lastConfirmedDiffSequence,
                long lastConfirmedDiffServerTick,
                OnlinePlayerIntentRequestType type,
                OnlinePlayerIntentRequestPayload payload) {
}
