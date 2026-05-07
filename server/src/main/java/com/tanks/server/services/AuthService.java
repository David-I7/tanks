package com.tanks.server.services;

import com.tanks.server.entities.RefreshToken;
import com.tanks.server.entities.User;
import com.tanks.server.model.JwtSession;
import com.tanks.server.repositories.RefreshTokenRepository;
import com.tanks.server.security.properties.JwtProperties;
import com.tanks.server.security.services.JwtService;
import com.tanks.server.utils.IdFactory;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseCookie;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@AllArgsConstructor
@Slf4j
public class AuthService {

    private JwtProperties jwtProperties;

    private JwtService jwtService;

    private IdFactory idFactory;

    private RefreshTokenRepository tokenRepository;

    private PasswordEncoder passwordEncoder;

    private ResponseCookie createRefreshCookie(String refreshToken){
        return ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)       // prevents JS access
                .secure(false)         // True in production
                .path("/api/v1/auth/refresh") // limit where cookie is sent
                .maxAge(Duration.ofMillis(jwtProperties.getRefreshTokenExpirationMS()))
                .sameSite("Lax")   // "Strict" in production
                .build();
    }

    public JwtSession createSession(User user){
        UUID jti = idFactory.randomUUID();
        OffsetDateTime expiration = OffsetDateTime.now().plusSeconds(jwtProperties.getRefreshTokenExpirationMS() / 1000);

        String refreshToken = jwtService.generateToken(user.getId().toString(),Map.of("jti",jti), expiration.toInstant().toEpochMilli());

        JwtSession session = new JwtSession(
                this.generateAccessToken(user),
                refreshToken,
                this.createRefreshCookie(refreshToken)
        );

        RefreshToken token = RefreshToken.builder()
                .id(jti)
                .tokenHash(passwordEncoder.encode(refreshToken))
                .expiresAt(expiration)
                .revoked(false)
                .user(user)
                .build();

        tokenRepository.save(token);

        return session;
    }

    public JwtSession rollingSession(String refreshToken){
        try{
            Claims claims = jwtService.getClaims(refreshToken);
            long expiresAt = Long.parseLong((String)claims.get("expiration"));

            if(!shouldRollSession(expiresAt)) return null;

            UUID jti = UUID.fromString((String) claims.get("jti"));

            Optional<RefreshToken> token = tokenRepository.findById(jti);

            // Token reuse detected
            if(!token.isPresent() || (token.isPresent() && token.get().getRevoked() == true) ){
                log.warn("Token reuse detected");
                return null;
            }

            User user = token.get().getUser();
            tokenRepository.revokeById(jti);

            JwtSession session = this.createSession(user);

            return session;

        }catch (JwtException ex){
            return null;
        }
    }

    @Transactional
    public void revokeRefreshToken(String refreshToken){
        UUID jti;

        try{
            Claims claims = jwtService.getClaims(refreshToken);
            tokenRepository.revokeById(UUID.fromString((String) claims.get("jti")));
        }catch (JwtException ex){
            return;
        }
    }

    private String generateAccessToken(User user){
        return jwtService.generateAccessToken(user.getId().toString(),Map.of("username",user.getUsername(),"email",user.getEmail()));
    }

    private String generateRefreshToken(User user){
        return  jwtService.generateRefreshToken(user.getId().toString(),Map.of("jti", idFactory.randomUUID()));
    }

    @Scheduled(fixedDelay = 1,timeUnit = TimeUnit.DAYS)
    @Transactional
    private void removeExpiredTokens(){
        tokenRepository.deleteExpiredTokens();
    }

    private boolean shouldRollSession(long expiration){
        long timeTilExpires =  expiration - Instant.now().toEpochMilli();

        return timeTilExpires > 0 && timeTilExpires <= 1000L * 60 * 60 * 60 * 24;
    }
}
