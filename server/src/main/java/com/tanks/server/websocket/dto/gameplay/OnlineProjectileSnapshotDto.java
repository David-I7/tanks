package com.tanks.server.websocket.dto.gameplay;

public record OnlineProjectileSnapshotDto(
                long entityId,
                long ownerPlayerId,
                String projectileDefinitionId,
                OnlineVec2Dto position,
                OnlineVec2Dto velocity) {
}
