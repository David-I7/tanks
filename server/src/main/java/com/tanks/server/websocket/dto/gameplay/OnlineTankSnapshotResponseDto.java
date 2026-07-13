package com.tanks.server.websocket.dto.gameplay;

import java.util.List;

public record OnlineTankSnapshotResponseDto(
                long entityId,
                long playerId,
                String displayName,
                String tankDefinitionId,
                String renderAssetId,
                OnlineVec2Dto position,
                int facing,
                double aimAngle,
                double power,
                String selectedProjectileSlotId,
                List<OnlineProjectileSlotSnapshotResponseDto> loadout,
                int health,
                int maxHealth,
                int fuel,
                boolean alive) {
}
