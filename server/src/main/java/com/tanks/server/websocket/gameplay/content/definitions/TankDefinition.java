package com.tanks.server.websocket.gameplay.content.definitions;

import java.util.List;
import lombok.Builder;

@Builder
public record TankDefinition(
        String id,
        String name,
        int maxHealth,
        int maxFuel,
        int movementQuantum,
        int fuelRate,
        int climbCapability,
        int width,
        int height,
        double barrelLength,
        double turretYOffset,
        TankVisual visual,
        List<String> loadout) {

    public TankDefinition {
        loadout = loadout != null ? List.copyOf(loadout) : List.of();
    }

    public double collisionRadius() {
        return Math.max(width, height) / 2.0;
    }

    public int halfWidth() {
        return width / 2;
    }

    public double trackGroundOffset() {
        return height / 2.0;
    }

    public double muzzleForwardOffset() {
        return barrelLength;
    }

    public double muzzleVerticalOffset() {
        return turretYOffset;
    }
}
