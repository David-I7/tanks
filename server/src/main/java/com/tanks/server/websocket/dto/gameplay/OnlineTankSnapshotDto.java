package com.tanks.server.websocket.dto.gameplay;

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
                double health,
                double maxHealth,
                double fuel,
                boolean alive) {
}
