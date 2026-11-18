package com.tanks.server.websocket.dto.lobby;

import java.util.UUID;

public record LobbyEventPayload(
        UUID id,
        UUID hostId,
        UUID triggeredBy
) {
}
