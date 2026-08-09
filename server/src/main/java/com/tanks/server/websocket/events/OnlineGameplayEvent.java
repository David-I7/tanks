package com.tanks.server.websocket.events;

public class OnlineGameplayEvent extends WebSocketEvent<Object> {
    public OnlineGameplayEvent(Object source, String username, String destination, Object payload) {
        super(source, username, destination, payload);
    }
}
