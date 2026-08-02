package com.tanks.server.websocket.events;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponseDto;

public class OnlineGameplayEvent extends WebSocketEvent<OnlineDiffResponseDto> {
    public OnlineGameplayEvent(Object source, String username, String destination, OnlineDiffResponseDto payload) {
        super(source, username, destination, payload);
    }
}
