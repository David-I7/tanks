package com.tanks.server.services;

import com.tanks.server.security.properties.JwtProperties;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@AllArgsConstructor
public class AuthService {

    private JwtProperties jwtProperties;

    public ResponseCookie createRefreshCookie(String refreshToken){
        return ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)       // prevents JS access
                .secure(false)         // True in production
                .path("/auth/refresh") // limit where cookie is sent
                .maxAge(Duration.ofMillis(jwtProperties.getRefreshTokenExpirationMS()))
                .sameSite("Lax")   // "Strict" in production
                .build();
    }

}
