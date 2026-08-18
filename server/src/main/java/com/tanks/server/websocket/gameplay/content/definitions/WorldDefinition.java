package com.tanks.server.websocket.gameplay.content.definitions;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public record WorldDefinition(
        List<String> biomes,
        int width,
        int height,
        int tickRateHz,
        double gravity,
        int maxProjectileSteps,
        long movementSegmentDurationTicks,
        SpawnRegion playerASpawnRegion,
        SpawnRegion playerBSpawnRegion,
        double minWind,
        double maxWind,
        int turnDurationSeconds,
        int matchDurationSeconds,
        double postImpactDelaySeconds,
        LootCrateConfig lootCrates) {

    public WorldDefinition {
        biomes = biomes != null ? List.copyOf(biomes) : List.of();
    }

    public double deltaTime() {
        return 1.0 / tickRateHz;
    }

    public String selectBiome() {
        if (biomes.isEmpty()) {
            throw new IllegalStateException("No biomes defined in WorldDefinition");
        }
        return biomes.get(ThreadLocalRandom.current().nextInt(biomes.size()));
    }

    public double generateWind() {
        if (Double.compare(minWind, maxWind) == 0) {
            return minWind;
        }
        double raw = minWind + ThreadLocalRandom.current().nextDouble() * (maxWind - minWind);
        return Math.round(raw * 1000.0) / 1000.0;
    }
}
