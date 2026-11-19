package com.tanks.server.websocket.dto.gameplay.terrain.patch;

import java.util.List;

public record HeightmapRange(
        TerrainPatchKind kind,
        int startX,
        List<Integer> surface) implements OnlineTerrainPatchResponseDto {
}
