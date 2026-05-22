package com.tanks.server.security.model;

import com.tanks.server.dto.UserDto;
import org.springframework.http.ResponseCookie;

public record JwtSession(String accessToken, ResponseCookie cookie, UserDto userDto) {
}
