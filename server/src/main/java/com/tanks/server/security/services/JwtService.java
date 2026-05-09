package com.tanks.server.security.services;

import com.tanks.server.exceptions.InvalidJwtException;
import com.tanks.server.security.properties.JwtProperties;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Service
@Slf4j
@AllArgsConstructor
public class JwtService {

    private JwtProperties jwtProperties;

    public String generateAccessToken(String subject,Map<String,Object> claims){
       return generateToken(subject,claims,jwtProperties.getAccessTokenExpirationMS());
    }

    public String generateRefreshToken(String subject,Map<String,Object> claims){
        return generateToken(subject, claims,jwtProperties.getRefreshTokenExpirationMS());
    }

    public String generateToken(String subject,Map<String,Object> claims, long expirationMS){
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
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public Claims parseClaims(String token){
        try {
            return Jwts.parser()
                    .verifyWith(getSignInKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        }catch (JwtException e){
            throw mapToInvalidJwtException(e);
        }
    }

    private InvalidJwtException mapToInvalidJwtException(JwtException e){
        String message;
        if ( e instanceof MalformedJwtException){
            message = "Malformed jwt token";
        }else if (e instanceof ExpiredJwtException ){
            message = "Expired jwt token";
        }else{
            message = "Failed to parse jwt token";
        }

        return new InvalidJwtException(message);
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
