package com.tanks.server.controllers;

import com.tanks.server.security.dto.AuthRequest;
import com.tanks.server.security.dto.AuthResponse;
import com.tanks.server.security.entities.GuestUser;
import com.tanks.server.security.services.JwtService;
import com.tanks.server.utils.IdFactory;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@AllArgsConstructor
public class AuthController {

    private JwtService jwtService;

    private IdFactory idFactory;

    @PostMapping("/guest")
    public AuthResponse login(@RequestBody AuthRequest authRequest){
        String username = authRequest.getUsername().isEmpty() ? "GUEST" : authRequest.getUsername();
        String id = idFactory.randomUUID().toString();

        GuestUser guestUser = new GuestUser(username,id);

        String accessToken = jwtService.generateAccessToken(guestUser);

        return new AuthResponse(accessToken,guestUser);
    }
}
