package com.tanks.server.websocket.gameplay.content;

import java.util.Map;
import com.tanks.server.websocket.gameplay.content.definitions.ProjectileDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.TankDefaults;
import com.tanks.server.websocket.gameplay.content.definitions.TankDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.ValidationRules;
import com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition;

public record GameContent(
        String version,
        WorldDefinition world,
        TankDefaults tankDefaults,
        Map<String, TankDefinition> tanks,
        Map<String, ProjectileDefinition> projectiles,
        ValidationRules validation) {

    public GameContent {
        tanks = tanks != null ? Map.copyOf(tanks) : Map.of();
        projectiles = projectiles != null ? Map.copyOf(projectiles) : Map.of();
    }

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
