package com.tanks.server.websocket.gameplay.content.definitions;

public record TankDefaults(
        int maxHealth,
        int maxFuel,
        int movementQuantum,
        int fuelRate,
        int climbCapability,
        int width,
        int height,
        double barrelLength,
        double turretYOffset) {
}
