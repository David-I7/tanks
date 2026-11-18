package com.tanks.server.dto.request;

import com.tanks.server.validation.ValidNickname;
import jakarta.validation.constraints.NotBlank;

public record JoinLobbyRequestDto(
        @NotBlank @ValidNickname String nickname,
        @NotBlank String tankId) {
}
