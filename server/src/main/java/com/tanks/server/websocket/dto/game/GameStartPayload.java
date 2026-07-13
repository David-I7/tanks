package com.tanks.server.websocket.dto.game;

import java.time.OffsetDateTime;
import java.util.UUID;

public record GameStartPayload(
    UUID gameSessionId,
    String playerA,
    String playerB,
    OffsetDateTime gameStartedAt,
    String gameContentVersion,
    long localPlayerId
) {
}
