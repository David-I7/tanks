package com.tanks.server.websocket.dto.gameplay.playerIntent.payloads;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestPayload;

public class MoveIntentRequestPayload implements OnlinePlayerIntentRequestPayload {
    private final int direction;

    @JsonCreator
    public MoveIntentRequestPayload(@JsonProperty("direction") int direction) {
        this.direction = direction;
    }

    public int getDirection() {
        return direction;
    }
}
