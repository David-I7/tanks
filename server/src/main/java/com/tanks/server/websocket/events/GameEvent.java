package com.tanks.server.websocket.events;

import com.tanks.server.websocket.dto.game.GameEventResponseDto;

public class GameEvent extends WebSocketEvent<GameEventResponseDto> {
    public GameEvent(Object source, String username, String destination, GameEventResponseDto payload) {
        super(source, username, destination, payload);
    }
}
