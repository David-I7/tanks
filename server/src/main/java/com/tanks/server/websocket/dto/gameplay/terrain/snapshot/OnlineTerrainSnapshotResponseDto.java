package com.tanks.server.websocket.dto.gameplay.terrain.snapshot;

public sealed interface OnlineTerrainSnapshotResponseDto permits Heightmap {
    TerrainSnapshotKind kind();
    int width();
    int height();
}
