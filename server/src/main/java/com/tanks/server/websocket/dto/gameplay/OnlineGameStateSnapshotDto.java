package com.tanks.server.websocket.dto.gameplay;

import java.util.List;

public record OnlineGameStateSnapshotDto(
                String gameplayDefinitionVersion,
                OnlineMatchSnapshotDto match,
                OnlineTerrainSnapshotDto terrain,
                List<OnlineTankSnapshotDto> tanks,
                List<OnlineProjectileSnapshotDto> projectiles) {
}
