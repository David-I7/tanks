package com.tanks.server.websocket.gameplay.content;

import java.util.Map;
import com.tanks.server.websocket.gameplay.content.definitions.*;

public record GameContent(
        String version,
        WorldDefinition world,
        Map<String, TankDefinition> tanks,
        Map<String, ProjectileDefinition> projectiles,
        ValidationRules validation) {

    public TankDefinition requireTank(String id) {
        TankDefinition def = tanks.get(id);
        if (def == null) throw new IllegalArgumentException("Unknown Tank Definition: " + id);
        return def;
    }

    public ProjectileDefinition requireProjectile(String id) {
        ProjectileDefinition def = projectiles.get(id);
        if (def == null) throw new IllegalArgumentException("Unknown Projectile Definition: " + id);
        return def;
    }
}
