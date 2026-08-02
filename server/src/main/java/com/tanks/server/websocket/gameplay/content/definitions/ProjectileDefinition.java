package com.tanks.server.websocket.gameplay.content.definitions;

import com.tanks.server.websocket.gameplay.content.damage.DamageEffect;
import com.tanks.server.websocket.gameplay.content.terrain.TerrainEffect;

public record ProjectileDefinition(
        String id,
        String name,
        String label,
        double radius,
        double baseVelocity,
        double gravityScale,
        double drag,
        TerrainEffect terrainEffect,
        DamageEffect damageEffect,
        SubMunitionConfig subMunitions,
        DamageTrailConfig damageTrail) {
}
