package com.tanks.server.websocket.dto.gameplay.diffResponse.payloads;

import java.util.List;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponsePayload;
import com.tanks.server.websocket.dto.gameplay.diffResponse.SubMunitionTrajectoryDto;
import com.tanks.server.websocket.dto.gameplay.snapshots.OnlineTankDamageResponseDto;
import lombok.Builder;

@Builder
public record ProjectileResolution(
        long projectileEntityId,
        long ownerPlayerId,
        String projectileDefinitionId,
        OnlineVec2Dto launch,
        List<OnlineVec2Dto> trajectory,
        OnlineVec2Dto impact,
        List<OnlineTankDamageResponseDto> damagedTanks,
        List<SubMunitionTrajectoryDto> subMunitions) implements OnlineDiffResponsePayload {

}
