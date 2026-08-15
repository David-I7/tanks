package com.tanks.server.websocket.dto.gameplay.snapshots;

import lombok.Builder;

@Builder
public record OnlineLootCrateSnapshotResponseDto(
        String crateId,
        String crateType,
        double x,
        double y,
        double targetY,
        boolean isLanding,
        boolean collected,
        Integer value) {
}
