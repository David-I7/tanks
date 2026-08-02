package com.tanks.server.websocket.dto.gameplay.diffResponse.states;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponsePayload;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.TerminalGameReason;
import com.tanks.server.websocket.dto.gameplay.snapshots.OnlineGameStateSnapshotResponseDto;
import lombok.Builder;

@Builder
public record TerminalGame(
        Long winnerPlayerId,
        TerminalGameReason reason,
        OnlineGameStateSnapshotResponseDto finalState) implements OnlineDiffResponsePayload {
}
