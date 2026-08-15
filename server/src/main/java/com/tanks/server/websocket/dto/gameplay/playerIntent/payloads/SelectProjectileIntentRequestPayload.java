package com.tanks.server.websocket.dto.gameplay.playerIntent.payloads;

import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestPayload;

public class SelectProjectileIntentRequestPayload implements OnlinePlayerIntentRequestPayload {
    private final int slot;

    public SelectProjectileIntentRequestPayload(int slot) {
        this.slot = slot;
    }

    public int getSlot() {
        return slot;
    }
}
