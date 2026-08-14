package com.tanks.server.websocket.dto.gameplay.diffResponse.payloads;

import java.util.List;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponsePayload;
import com.tanks.server.websocket.dto.gameplay.terrain.patch.OnlineTerrainPatchResponseDto;
import lombok.Builder;

@Builder
public record TerrainPatch(List<OnlineTerrainPatchResponseDto> patches) implements OnlineDiffResponsePayload {
}
