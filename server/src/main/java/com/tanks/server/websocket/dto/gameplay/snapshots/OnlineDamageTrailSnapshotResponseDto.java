package com.tanks.server.websocket.dto.gameplay.snapshots;

import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import lombok.Builder;

@Builder
public record OnlineDamageTrailSnapshotResponseDto(
        String id,
        long ownerPlayerId,
        OnlineVec2Dto position,
        double radius,
        double damagePerSecond,
        double durationSeconds,
        String hazardType) {
}

