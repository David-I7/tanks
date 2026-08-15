package com.tanks.server.websocket.dto.gameplay.playerIntent.payloads;

import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestPayload;

public class MoveIntentRequestPayload implements OnlinePlayerIntentRequestPayload {
    private final int direction;

    public MoveIntentRequestPayload(int direction) {
        this.direction = direction;
    }

    public int getDirection() {
        return direction;
    }
}
