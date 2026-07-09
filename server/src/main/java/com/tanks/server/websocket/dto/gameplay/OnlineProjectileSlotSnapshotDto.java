package com.tanks.server.websocket.dto.gameplay;

public record OnlineProjectileSlotSnapshotDto(
        String id,
        String projectileDefinitionId,
        String label,
        String renderAssetId) {
}
