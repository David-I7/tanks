package com.tanks.server.websocket.dto.gameplay.terrain.snapshot;

import java.util.List;

public record Heightmap(
        TerrainSnapshotKind kind,
        int width,
        int height,
        List<Integer> surface) implements OnlineTerrainSnapshotResponseDto {
}
