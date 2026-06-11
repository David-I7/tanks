package com.tanks.server.websocket.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public abstract class WebSocketEvent<T> extends ApplicationEvent {
    private final String username;
    private final String destination;
    private final T payload;

    public WebSocketEvent(Object source, String username, String destination, T payload) {
        super(source);
        this.username = username;
        this.destination = destination;
        this.payload = payload;
    }
}
