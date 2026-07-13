package com.tanks.server.websocket.gameplay.content;

import java.util.Map;

public record GameContent(
        String version,
        WorldDefinition world,
        Map<String, TankDefinition> tanks,
        Map<String, ProjectileDefinition> projectiles,
        ValidationRules validation) {

    public GameContent {
        tanks = Map.copyOf(tanks);
        projectiles = Map.copyOf(projectiles);
    }

    public TankDefinition requireTank(String id) {
        var value = tanks.get(id);
        if (value == null) throw new IllegalArgumentException("Unknown tank definition: " + id);
        return value;
    }

    public ProjectileDefinition requireProjectile(String id) {
        var value = projectiles.get(id);
        if (value == null) throw new IllegalArgumentException("Unknown projectile definition: " + id);
        return value;
    }
}
