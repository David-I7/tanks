package com.tanks.server.services;

import com.tanks.server.dto.auth.RefreshTokenResponse;
import com.tanks.server.entities.RefreshToken;
import com.tanks.server.entities.User;
import com.tanks.server.security.properties.JwtProperties;
import com.tanks.server.security.services.JwtService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;

@Service
@AllArgsConstructor
public class AuthService {

    private JwtProperties jwtProperties;

    private JwtService jwtService;

    public ResponseCookie createRefreshCookie(String refreshToken){
        return ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)       // prevents JS access
                .secure(false)         // True in production
                .path("/auth/refresh") // limit where cookie is sent
                .maxAge(Duration.ofMillis(jwtProperties.getRefreshTokenExpirationMS()))
                .sameSite("Lax")   // "Strict" in production
                .build();
    }

    public RefreshTokenResponse createSession(User user){

        return null;

    }


}
