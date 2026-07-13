package com.tanks.server.websocket.gameplay.content;

public record WorldDefinition(
        int width,
        int height,
        int bedrockDepth,
        int tickRateHz,
        double gravity,
        double projectileTimeStepSeconds,
        int maxProjectileSteps,
        long movementSegmentDurationTicks,
        SpawnRegion playerASpawnRegion,
        SpawnRegion playerBSpawnRegion) {

    public int bedrockY() {
        return height - bedrockDepth;
    }
}
