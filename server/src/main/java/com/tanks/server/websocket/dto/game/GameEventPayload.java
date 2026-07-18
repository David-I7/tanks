package com.tanks.server.websocket.dto.game;

import java.util.UUID;

public record GameEventPayload(
        UUID id,
        Long hostId,
        String triggeredBy
) {
}

