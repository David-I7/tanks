package com.tanks.server.websocket.dto.gameplay.snapshots;

import java.util.List;
import com.tanks.server.websocket.dto.gameplay.gameContent.GameContentResponseDto;
import com.tanks.server.websocket.dto.gameplay.match.OnlineMatchSnapshotResponseDto;
import com.tanks.server.websocket.dto.gameplay.terrain.snapshot.OnlineTerrainSnapshotResponseDto;
import lombok.Builder;

@Builder
public record OnlineGameStateSnapshotResponseDto(
                String gameContentVersion,
                GameContentResponseDto gameContent,
                OnlineMatchSnapshotResponseDto match,
                OnlineTerrainSnapshotResponseDto terrain,
                List<OnlineTankSnapshotResponseDto> tanks,
                List<OnlineProjectileSnapshotResponseDto> projectiles,
                List<OnlineLootCrateSnapshotResponseDto> lootCrates,
                List<OnlineDamageTrailSnapshotResponseDto> damageTrails) {
}
