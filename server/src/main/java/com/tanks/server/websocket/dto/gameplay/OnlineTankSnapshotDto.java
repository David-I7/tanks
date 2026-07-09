package com.tanks.server.websocket.dto.gameplay;

import java.util.List;

public record OnlineTankSnapshotDto(
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
                List<OnlineProjectileSlotSnapshotDto> loadout,
                double health,
                double maxHealth,
                double fuel,
                boolean alive) {
}
