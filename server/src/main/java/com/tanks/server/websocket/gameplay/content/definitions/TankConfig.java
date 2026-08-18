package com.tanks.server.websocket.gameplay.content.definitions;

import java.util.List;

public record TankConfig(
        String name,
        TankVisual visual,
        List<String> loadout) {

    public TankConfig {
        loadout = loadout != null ? List.copyOf(loadout) : List.of();
    }

    public TankDefinition toTankDefinition(String id, TankDefaults defaults) {
        return new TankDefinition(
                id,
                name(),
                defaults.maxHealth(),
                defaults.maxFuel(),
                defaults.movementQuantum(),
                defaults.fuelRate(),
                defaults.climbCapability(),
                defaults.width(),
                defaults.height(),
                defaults.barrelLength(),
                defaults.turretYOffset(),
                visual(),
                loadout());
    }
}
