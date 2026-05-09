package com.tanks.server.services;

import com.tanks.server.entities.RefreshToken;
import com.tanks.server.repositories.RefreshTokenRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@AllArgsConstructor
public class RefreshTokenService {

    private RefreshTokenRepository repository;

    public RefreshToken findById(UUID jti){
        return repository.findById(jti).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    public void save(RefreshToken refreshToken){
        repository.save(refreshToken);
    }

    public void revokeById(UUID jti){
        repository.revokeById(jti);
    }

    @Scheduled(fixedDelay = 1,timeUnit = TimeUnit.DAYS)
    private void removeExpiredTokens(){
        repository.deleteExpiredTokens();
    }

}
