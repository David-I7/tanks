package com.tanks.server.websocket.dto.gameplay;

public record OnlineTankDamageDto(
                long tankEntityId,
                long playerId,
                double damage,
                double remainingHealth) {
}
