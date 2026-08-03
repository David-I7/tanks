package com.tanks.server.dto.test;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MockGameSetupResponseDto {
    private UUID gameSessionId;
    private String playerAToken;
    private String playerBToken;
    private String playerAUsername;
    private String playerBUsername;
    private long playerAId;
    private long playerBId;
    private long activePlayerId;
}
