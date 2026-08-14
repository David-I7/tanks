package com.tanks.server.websocket.dto.gameplay.snapshots;

public record OnlineTankDamageResponseDto(
                long entityId,
                long playerId,
                int damageDealt,
                int healthAfter) {
}
