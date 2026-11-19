package com.tanks.server.websocket.dto.gameplay.diffResponse.payloads;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponsePayload;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.ResyncReason;
import com.tanks.server.websocket.dto.gameplay.snapshots.OnlineGameStateSnapshotResponseDto;
import lombok.Builder;

@Builder
public record ResyncState(
        long replacesSequence,
        ResyncReason reason,
        long localPlayerId,
        OnlineGameStateSnapshotResponseDto state) implements OnlineDiffResponsePayload {
}
