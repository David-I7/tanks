package com.tanks.server.websocket.dto.gameplay;

import java.util.List;

public sealed interface OnlineTerrainSnapshotDto
                permits OnlineTerrainSnapshotDto.Heightmap, OnlineTerrainSnapshotDto.Mask {

        public enum TerrainSnapshotKind {
                HEIGHTMAP,
                MASK
        }

        TerrainSnapshotKind kind();

        int width();

        int height();

        public record Heightmap(
                        TerrainSnapshotKind kind,
                        int width,
                        int height,
                        List<Integer> surface) implements OnlineTerrainSnapshotDto {
        }

        public record Mask(
                        TerrainSnapshotKind kind,
                        int width,
                        int height,
                        String solidBase64) implements OnlineTerrainSnapshotDto {
        }
}

