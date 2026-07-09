package com.tanks.server.websocket.gameplay;

public record OnlineProjectileDefinition(
        String id,
        String name,
        String renderAssetId,
        OnlineProjectilePhysics physics,
        OnlineTerrainEffect terrainEffect,
        OnlineDamageEffect damageEffect,
        String impactRenderAssetId,
        double impactDuration) {
}
