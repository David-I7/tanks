package com.tanks.server.dto.auth;

import com.tanks.server.dto.UserDto;

public record RefreshTokenResponse(String accessToken, UserDto user) {
}
