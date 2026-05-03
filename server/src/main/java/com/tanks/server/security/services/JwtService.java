package com.tanks.server.security.services;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Service
@Slf4j
public class JwtService {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.access.token.expiration}")
    private long jwtAccessTokenExpirationMS;

    @Value("${app.jwt.access.token.expiration}")
    private long jwtRefreshTokenExpirationMS;

    public String generateAccessToken(String subject,Map<String,Object> claims){
       return generateToken(subject,claims,jwtAccessTokenExpirationMS);
    }

    public String generateRefreshToken(String subject,Map<String,Object> claims){
        return generateToken(subject, claims,jwtRefreshTokenExpirationMS);
    }

    private String generateToken(String subject,Map<String,Object> claims, long expirationMS){
        Date now = new Date();
        Date expirationDate = new Date(now.getTime() + expirationMS);

        return Jwts.builder()
                .issuedAt(now)
                .expiration(expirationDate)
                .signWith(getSignInKey())
                .subject(subject)
                .claims(claims)
                .compact();
    }

    private SecretKey getSignInKey(){
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public Claims getClaims(String token){
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValidToken(String token){
        try {
            Jwts.parser()
                    .verifyWith(getSignInKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        }catch (JwtException ex){
            log.debug("Invalid jwt detected: {}",ex.getMessage());
            return false;
        }
    }
}
