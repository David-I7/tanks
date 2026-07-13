package com.tanks.server.websocket.gameplay.content;

import java.util.List;

public record TankDefinition(
        String id,
        String name,
        String renderAssetId,
        int maxHealth,
        int maxFuel,
        int movementQuantum,
        int fuelRate,
        int climbCapability,
        double collisionRadius,
        int halfWidth,
        double trackGroundOffset,
        double muzzleForwardOffset,
        double muzzleVerticalOffset,
        List<ProjectileSlotDefinition> loadout) {

    public TankDefinition {
        loadout = List.copyOf(loadout);
    }
}
