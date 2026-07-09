package com.tanks.server.websocket.dto.gameplay;

import java.util.List;

public sealed interface OnlineTerrainPatchDto
                permits OnlineTerrainPatchDto.HeightmapRange, OnlineTerrainPatchDto.MaskRect {

        public enum TerrainPatchKind {
                HEIGHTMAP_RANGE,
                MASK_RECT
        }

        TerrainPatchKind kind();

        public record HeightmapRange(
                        TerrainPatchKind kind,
                        int startX,
                        List<Integer> surface) implements OnlineTerrainPatchDto {
        }

        public record MaskRect(
                        TerrainPatchKind kind,
                        int x,
                        int y,
                        int width,
                        int height,
                        String solidBase64) implements OnlineTerrainPatchDto {
        }
}
