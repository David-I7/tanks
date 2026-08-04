package com.tanks.server.dto.test;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MockGameSetupResponseDto {
    private String playerAToken;
    private String playerBToken;
    private String playerCToken;
    private String playerAUsername;
    private String playerBUsername;
    private String playerCUsername;
    private Long playerAId;
    private Long playerBId;
    private Long playerCId;
}

