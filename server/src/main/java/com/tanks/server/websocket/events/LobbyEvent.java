package com.tanks.server.websocket.events;

import com.tanks.server.websocket.dto.lobby.LobbyEventResponseDto;

public class LobbyEvent extends WebSocketEvent<LobbyEventResponseDto> {
    public LobbyEvent(Object source, String username, String destination, LobbyEventResponseDto payload) {
        super(source, username, destination, payload);
    }
}
