package com.tanks.server.websocket.gameplay.content;

import lombok.Builder;

@Builder

public record ProjectileDefinition(
        String id,
        String name,
        String renderAssetId,
        double radius,
        double baseVelocity,
        double gravityScale,
        double drag,
        double muzzleVelocityScale,
        TerrainEffect terrainEffect,
        DamageEffect damageEffect,
        String impactRenderAssetId,
        double impactDuration) {
}
