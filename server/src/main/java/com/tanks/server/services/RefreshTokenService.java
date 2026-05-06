package com.tanks.server.services;

import com.tanks.server.repositories.RefreshTokenRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class RefreshTokenService {

    private RefreshTokenRepository repository;



}
