package com.tanks.server.websocket.gameplay.content;

public record SpawnRegion(int minX, int maxX) {
    public SpawnRegion {
        if (minX > maxX) throw new IllegalArgumentException("Spawn Region minX must not exceed maxX");
    }
}
