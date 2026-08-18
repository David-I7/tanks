package com.tanks.server.websocket.gameplay.content.definitions;

import java.util.concurrent.ThreadLocalRandom;

public record WorldDefinition(
        String biome,
        int width,
        int height,
        int tickRateHz,
        double gravity,
        double deltaTime,
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

    public double generateWind() {
        if (Double.compare(minWind, maxWind) == 0) {
            return minWind;
        }
        double raw = minWind + ThreadLocalRandom.current().nextDouble() * (maxWind - minWind);
        return Math.round(raw * 1000.0) / 1000.0;
    }
}
