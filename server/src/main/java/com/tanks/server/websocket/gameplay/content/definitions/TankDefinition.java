package com.tanks.server.websocket.gameplay.content.definitions;

import lombok.Builder;

import java.util.List;

@Builder
public record TankDefinition(
        String id,
        String name,
        String description,
        int maxHealth,
        int maxFuel,
        int movementQuantum,
        int fuelRate,
        int climbCapability,
        int width,
        int height,
        TankVisual visual,
        List<String> loadout) {

    public TankDefinition {
        loadout = List.copyOf(loadout);
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
        return width / 2.0;
    }

    public double muzzleVerticalOffset() {
        return height / 2.0;
    }
}
