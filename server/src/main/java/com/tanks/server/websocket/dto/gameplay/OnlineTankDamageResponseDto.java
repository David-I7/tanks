package com.tanks.server.websocket.dto.gameplay;

public record OnlineTankDamageResponseDto(
                long tankEntityId,
                long playerId,
                int damage,
                int remainingHealth) {
}
