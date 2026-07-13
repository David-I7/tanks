package com.tanks.server.websocket.dto.gameplay;

public record OnlineProjectileSnapshotResponseDto(
                long entityId,
                long ownerPlayerId,
                String projectileDefinitionId,
                String renderAssetId,
                OnlineVec2Dto position,
                OnlineVec2Dto velocity) {
}
