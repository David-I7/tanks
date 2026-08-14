package com.tanks.server.websocket.dto.gameplay.gameContent.definitions;

import com.tanks.server.websocket.gameplay.content.definitions.SpawnRegion;
import com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition;

public record WorldDefinitionResponseDto(
        String biome,
        int width,
        int height,
        int tickRateHz,
        double gravity,
        double deltaTime,
        int maxProjectileSteps,
        long movementSegmentDurationTicks,
        SpawnRegionResponseDto playerASpawnRegion,
        SpawnRegionResponseDto playerBSpawnRegion,
        double minWind,
        double maxWind) {

    public static WorldDefinitionResponseDto from(WorldDefinition value) {
        return new WorldDefinitionResponseDto(
                value.biome() != null ? value.biome() : "forest",
                value.width(),
                value.height(),
                value.tickRateHz(),
                value.gravity(),
                value.deltaTime(),
                value.maxProjectileSteps(),
                value.movementSegmentDurationTicks(),
                region(value.playerASpawnRegion()),
                region(value.playerBSpawnRegion()),
                value.minWind(),
                value.maxWind());
    }

    private static SpawnRegionResponseDto region(SpawnRegion value) {
        return new SpawnRegionResponseDto(value.minX(), value.maxX());
    }
}
