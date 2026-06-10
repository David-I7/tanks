package com.tanks.server.websocket.dto.game;

import java.util.UUID;

public record GameLobbyPayload(UUID id, String playerName) {
}

