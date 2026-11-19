package com.tanks.server.websocket.gameplay.world;

import lombok.Builder;

@Builder
public record InitialWorld(World world, TerrainModel terrainModel) {
}
