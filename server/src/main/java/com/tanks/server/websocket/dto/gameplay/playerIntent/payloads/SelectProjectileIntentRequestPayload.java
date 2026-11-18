package com.tanks.server.websocket.dto.gameplay.playerIntent.payloads;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestPayload;

public class SelectProjectileIntentRequestPayload implements OnlinePlayerIntentRequestPayload {
    private final int slot;

    @JsonCreator
    public SelectProjectileIntentRequestPayload(@JsonProperty("slot") int slot) {
        this.slot = slot;
    }

    public int getSlot() {
        return slot;
    }
}
