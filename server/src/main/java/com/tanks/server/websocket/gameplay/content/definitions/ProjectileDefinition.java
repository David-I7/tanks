package com.tanks.server.websocket.gameplay.content.definitions;

import com.tanks.server.websocket.gameplay.content.damage.DamageEffect;
import com.tanks.server.websocket.gameplay.content.terrain.TerrainEffect;

public record ProjectileDefinition(
        String id,
        String name,
        String label,
        boolean isDefault,
        double radius,
        double baseVelocity,
        double gravityScale,
        TerrainEffect terrainEffect,
        DamageEffect damageEffect,
        SubMunitionConfig subMunitions,
        DamageTrailConfig damageTrail) {

    public ProjectileDefinition withId(String id) {
        return new ProjectileDefinition(
                id,
                name(),
                label(),
                isDefault(),
                radius(),
                baseVelocity(),
                gravityScale(),
                terrainEffect(),
                damageEffect(),
                subMunitions(),
                damageTrail());
    }
}
