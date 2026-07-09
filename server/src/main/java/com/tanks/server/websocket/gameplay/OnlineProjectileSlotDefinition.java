package com.tanks.server.websocket.gameplay;

public record OnlineProjectileSlotDefinition(
        String id,
        String projectileDefinitionId,
        String label,
        String renderAssetId) {
}
