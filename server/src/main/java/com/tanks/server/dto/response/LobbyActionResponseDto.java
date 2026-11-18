package com.tanks.server.dto.response;

import java.util.UUID;

public record LobbyActionResponseDto(UUID lobbyId, UUID playerId) {
}
