package com.tanks.server.websocket.dto.game;

import java.util.UUID;

public record GameIdPayload(UUID id, String playerName) {
}

