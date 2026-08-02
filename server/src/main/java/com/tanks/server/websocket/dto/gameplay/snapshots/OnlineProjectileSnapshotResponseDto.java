package com.tanks.server.websocket.dto.gameplay.snapshots;

import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;

public record OnlineProjectileSnapshotResponseDto(
                long entityId,
                long ownerPlayerId,
                String projectileDefinitionId,
                OnlineVec2Dto position,
                OnlineVec2Dto velocity) {
}
