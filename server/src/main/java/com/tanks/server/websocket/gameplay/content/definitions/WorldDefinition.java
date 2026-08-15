package com.tanks.server.websocket.gameplay.content.definitions;

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
        double maxWind) {

    public double generateWind() {
        if (Double.compare(minWind, maxWind) == 0) {
            return minWind;
        }
        double raw = minWind + java.util.concurrent.ThreadLocalRandom.current().nextDouble() * (maxWind - minWind);
        return Math.round(raw * 1000.0) / 1000.0;
    }
}

