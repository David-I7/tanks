package com.tanks.server.security.services;

import com.tanks.server.security.entities.JwtAuthentication;
import com.tanks.server.security.entities.GuestUser;
import com.tanks.server.utils.IdFactory;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
@Slf4j
public class JwtService {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private long jwtExpirationMS;

    public String generateAccessToken(GuestUser user){
        Date now = new Date();
        Date expirationDate = new Date(now.getTime() + jwtExpirationMS);

        return Jwts.builder()
                .issuedAt(now)
                .expiration(expirationDate)
                .signWith(getSignInKey())
                .subject(user.getUsername())
                .claim("id", user.getId())
                .compact();
    }

    public SecretKey getSignInKey(){
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public Authentication validate(String token){
        Claims claims = Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return new JwtAuthentication(new GuestUser(claims.getSubject(),claims.get("id",String.class)));
    }
}
