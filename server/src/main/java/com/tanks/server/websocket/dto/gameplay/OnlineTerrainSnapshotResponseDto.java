package com.tanks.server.websocket.dto.gameplay;

import java.util.List;

public sealed interface OnlineTerrainSnapshotResponseDto permits OnlineTerrainSnapshotResponseDto.Heightmap {

        public enum TerrainSnapshotKind {
                HEIGHTMAP
        }

        TerrainSnapshotKind kind();

        int width();

        int height();

        public record Heightmap(
                        TerrainSnapshotKind kind,
                        int width,
                        int height,
                        List<Integer> surface) implements OnlineTerrainSnapshotResponseDto {
        }
}
