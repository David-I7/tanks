package com.tanks.server.websocket.events;

import com.tanks.server.websocket.dto.gameplay.OnlineDiffEnvelopeDto;

public class OnlineGameplayEvent extends WebSocketEvent<OnlineDiffEnvelopeDto<?>> {
    public OnlineGameplayEvent(Object source, String username, String destination, OnlineDiffEnvelopeDto<?> payload) {
        super(source, username, destination, payload);
    }
}
