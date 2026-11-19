package com.tanks.server.websocket.dto.gameplay.terrain.patch;

public sealed interface OnlineTerrainPatchResponseDto permits HeightmapRange {
    TerrainPatchKind kind();
}
