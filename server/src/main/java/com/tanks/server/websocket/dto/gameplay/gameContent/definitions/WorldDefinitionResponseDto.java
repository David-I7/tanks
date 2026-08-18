package com.tanks.server.websocket.dto.gameplay.gameContent.definitions;

import java.util.List;
import com.tanks.server.websocket.gameplay.content.definitions.SpawnRegion;
import com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition;

public record WorldDefinitionResponseDto(
        List<String> biomes,
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
        double maxWind,
        int turnDurationSeconds,
        int matchDurationSeconds,
        double postImpactDelaySeconds,
        LootCrateConfigResponseDto lootCrates) {

    public static WorldDefinitionResponseDto from(WorldDefinition value) {
        return new WorldDefinitionResponseDto(
                value.biomes(),
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
                value.maxWind(),
                value.turnDurationSeconds(),
                value.matchDurationSeconds(),
                value.postImpactDelaySeconds(),
                LootCrateConfigResponseDto.from(value.lootCrates()));
    }

    private static SpawnRegionResponseDto region(SpawnRegion value) {
        return new SpawnRegionResponseDto(value.minX(), value.maxX());
    }
}
