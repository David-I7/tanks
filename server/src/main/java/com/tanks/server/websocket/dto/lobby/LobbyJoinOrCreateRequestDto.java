package com.tanks.server.websocket.dto.lobby;

import com.tanks.server.websocket.validation.ValidLobbyJoinOrCreateRequestDto;

@ValidLobbyJoinOrCreateRequestDto
public record LobbyJoinOrCreateRequestDto(String tankId) {
}
