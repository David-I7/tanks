package com.tanks.server.websocket.dto.gameplay.diffResponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnlineDiffBatchResponseDto {
    private String gameSessionId;
    private long sequence;
    private long serverTick;
    private String intentId;
    private List<OnlineDiffResponseDto> diffs;
}
