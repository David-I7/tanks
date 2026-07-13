package com.tanks.server.websocket.dto.gameplay;

public record OnlineProjectileSlotSnapshotResponseDto(
        String id,
        String projectileDefinitionId,
        String label,
        String renderAssetId) {
}
