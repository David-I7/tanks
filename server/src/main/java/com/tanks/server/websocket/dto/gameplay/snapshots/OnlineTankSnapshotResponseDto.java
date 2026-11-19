package com.tanks.server.websocket.dto.gameplay.snapshots;

import java.util.List;
import java.util.Map;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.gameplay.content.definitions.TankVisual;
import lombok.Builder;

@Builder
public record OnlineTankSnapshotResponseDto(
                long entityId,
                long playerId,
                String displayName,
                String tankDefinitionId,
                int width,
                int height,
                TankVisual visual,
                OnlineVec2Dto position,
                int facing,
                double aimAngle,
                double power,
                String selectedProjectileSlotId,
                List<String> loadout,
                Map<String, Integer> weaponAmmo,
                int health,
                int maxHealth,
                int fuel,
                int maxFuel,
                boolean alive) {
}
