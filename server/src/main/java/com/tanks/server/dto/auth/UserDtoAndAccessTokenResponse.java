package com.tanks.server.dto.auth;

import com.tanks.server.dto.UserDto;

public record UserDtoAndAccessTokenResponse(String accessToken, UserDto user) {
}
