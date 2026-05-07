package com.tanks.server.model;

import org.springframework.http.ResponseCookie;

public record JwtSession(String accessToken, String refreshToken, ResponseCookie cookie) {
}
