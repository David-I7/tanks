package com.tanks.server.websocket.dto.gameplay.diffResponse;

import java.util.List;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.dto.gameplay.snapshots.OnlineTankDamageResponseDto;
import lombok.Builder;

@Builder
public record SubMunitionTrajectoryDto(
        String projectileDefinitionId,
        OnlineVec2Dto launch,
        List<OnlineVec2Dto> trajectory,
        OnlineVec2Dto impact,
        List<OnlineTankDamageResponseDto> damagedTanks) {
}
