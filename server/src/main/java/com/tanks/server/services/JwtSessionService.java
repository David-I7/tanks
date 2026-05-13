package com.tanks.server.services;

import com.tanks.server.dto.auth.RefreshTokenResponse;
import com.tanks.server.entities.RefreshToken;
import com.tanks.server.entities.User;
import com.tanks.server.exceptions.InvalidJwtException;
import com.tanks.server.mappers.user.UserToUserDtoMapper;
import com.tanks.server.model.JwtSession;
import com.tanks.server.security.properties.JwtProperties;
import com.tanks.server.security.services.JwtService;
import com.tanks.server.utils.IdFactory;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class JwtSessionService{

    private JwtService jwtService;

    private RefreshTokenService refreshTokenService;

    private UserToUserDtoMapper userDtoMapper = new UserToUserDtoMapper();

    private JwtProperties jwtProperties;


    public JwtSessionService(JwtProperties jwtProperties,JwtService jwtService,RefreshTokenService refreshTokenService){
        this.jwtProperties = jwtProperties;
        this.refreshTokenService = refreshTokenService;
        this.jwtService = jwtService;
    }

    private ResponseCookie createRefreshCookie(String refreshToken){
        return ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)       // prevents JS access
                .secure(false)         // True in production
                .path("/api/v1/auth") // limit where cookie is sent
                .maxAge(Duration.ofMillis(jwtProperties.getRefreshTokenExpirationMS()))
                .sameSite("Lax")   // "Strict" in production
                .build();
    }

    public ResponseCookie expireRefreshCookie(String refreshToken){
        return ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)       // prevents JS access
                .secure(false)         // True in production
                .path("/api/v1/auth") // limit where cookie is sent
                .maxAge(0)
                .sameSite("Lax")   // "Strict" in production
                .build();
    }

    public JwtSession createSession(User user){
        OffsetDateTime expiration = OffsetDateTime.now().plusSeconds(jwtProperties.getRefreshTokenExpirationMS() / 1000);
        RefreshToken token = RefreshToken.builder()
                .expiresAt(expiration)
                .revoked(false)
                .user(user)
                .build();

        refreshTokenService.save(token);

        String refreshToken = jwtService.generateToken(user.getId().toString(), Map.of("jti",token.getId().toString()), expiration.toInstant().toEpochMilli());

        JwtSession session = new JwtSession(
                this.generateAccessToken(user),
                this.createRefreshCookie(refreshToken),
                userDtoMapper.apply(user)
        );

        return session;
    }

    // Returns null if the refreshToken can be reused, otherwise it creates a new jwtSession.
    public JwtSession extendSession(String refreshToken){
        try{
            Claims claims = jwtService.parseClaims(refreshToken);
            long expiresAt = claims.get("exp",Long.class);

            if(!shouldCreateNewSession(expiresAt)) return null;

            UUID jti = UUID.fromString((String) claims.get("jti"));

            RefreshToken token = refreshTokenService.findById(jti);

            // Token reuse detected
            if( token.getRevoked() == true){
                log.warn("Token reuse detected");
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            }

            User user = token.getUser();
            refreshTokenService.revokeById(token.getId());

            JwtSession session = this.createSession(user);

            return session;

        } catch (InvalidJwtException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }

    // Issues a new access token
    public RefreshTokenResponse refresh(String refreshToken){
        try {
            Claims claims = jwtService.parseClaims(refreshToken);
            RefreshToken token = refreshTokenService.findById(UUID.fromString((String) claims.get("jti")));
            User user = token.getUser();
            return new RefreshTokenResponse(generateAccessToken(user), userDtoMapper.apply(user));
        } catch (InvalidJwtException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }

    public void revokeRefreshToken(String refreshToken){
        try {
            Claims claims = jwtService.parseClaims(refreshToken);
            refreshTokenService.revokeById(UUID.fromString((String) claims.get("jti")));
        } catch (InvalidJwtException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }

    private String generateAccessToken(User user){
        return jwtService.generateAccessToken(user.getId().toString(),Map.of("username",user.getUsername(),"email",user.getEmail()));
    }

    private String generateRefreshToken(User user){
        return  jwtService.generateRefreshToken(user.getId().toString(),Map.of("jti", IdFactory.randomUUID()));
    }

    public boolean shouldCreateNewSession(String refreshToken){
        try{
            Claims claims = jwtService.parseClaims(refreshToken);
            return shouldCreateNewSession(claims.get("exp",Long.class));
        } catch (InvalidJwtException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }

    private boolean shouldCreateNewSession(long expiration){
        long timeTilExpires =  expiration - Instant.now().toEpochMilli();

        return timeTilExpires > 0 && timeTilExpires <= 1000L * 60 * 60 * 60 * 24; // 1 DAY
    }
}