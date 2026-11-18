package com.tanks.server.websocket.dto.game;

import java.util.UUID;

public record GameEventPayload(
        UUID id,
        UUID hostId,
        UUID triggeredBy
) {
}
