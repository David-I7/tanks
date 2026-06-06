package com.tanks.server.websocket.dto.game;

import java.time.OffsetDateTime;
import java.util.UUID;

public record GameStartedEventPayload(
    UUID gameSessionId,
    Long playerAId,
    Long playerBId,
    OffsetDateTime gameStartedAt
) {
}
