package com.tanks.server.websocket.dto.gameplay;

import java.util.List;

public sealed interface OnlineTerrainPatchResponseDto permits OnlineTerrainPatchResponseDto.HeightmapRange {

        public enum TerrainPatchKind {
                HEIGHTMAP_RANGE
        }

        TerrainPatchKind kind();

        public record HeightmapRange(
                        TerrainPatchKind kind,
                        int startX,
                        List<Integer> surface) implements OnlineTerrainPatchResponseDto {
        }
}
