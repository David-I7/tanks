package com.tanks.server.websocket.gameplay.world;

import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;

public record ProjectileState(long entityId, long ownerPlayerId, String definitionId,
        OnlineVec2Dto position, OnlineVec2Dto velocity) {
    public ProjectileState(ProjectileState other) {
        this(other.entityId, other.ownerPlayerId, other.definitionId,
                new OnlineVec2Dto(other.position.x(), other.position.y()),
                new OnlineVec2Dto(other.velocity.x(), other.velocity.y()));
    }
}
