package com.tanks.server.websocket.dto.gameplay;

import java.util.List;
import lombok.Builder;

@Builder

public record OnlineGameStateSnapshotResponseDto(
                String gameContentVersion,
                GameContentResponseDto gameContent,
                OnlineMatchSnapshotResponseDto match,
                OnlineTerrainSnapshotResponseDto terrain,
                List<OnlineTankSnapshotResponseDto> tanks,
                List<OnlineProjectileSnapshotResponseDto> projectiles) {
}
