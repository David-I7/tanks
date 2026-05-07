package com.tanks.server.controllers;

import com.tanks.server.dto.auth.LoginRequest;
import com.tanks.server.dto.auth.RefreshTokenResponse;
import com.tanks.server.dto.auth.RegisterRequest;
import com.tanks.server.entities.User;
import com.tanks.server.mappers.user.LoginRequestToUserMapper;
import com.tanks.server.mappers.user.RegisterRequestToUserMapper;
import com.tanks.server.mappers.user.UserToUserDtoMapper;
import com.tanks.server.model.JwtSession;
import com.tanks.server.security.services.JwtService;
import com.tanks.server.services.AuthService;
import com.tanks.server.services.UserService;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@AllArgsConstructor
public class AuthController {

    private UserService userService;

    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<RefreshTokenResponse> register(@Valid @RequestBody RegisterRequest request){
        User user = new RegisterRequestToUserMapper().apply(request);

        userService.register(user);

        JwtSession session = authService.createSession(user);

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE,session.cookie().toString())
                .body(new RefreshTokenResponse(session.accessToken(),new UserToUserDtoMapper().apply(user)));
    }

    @PostMapping("/login")
    public ResponseEntity<RefreshTokenResponse> login(@Valid @RequestBody LoginRequest loginRequest){

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE,session.cookie().toString())
                .body(new RefreshTokenResponse(session.accessToken(),new UserToUserDtoMapper().apply(user)));
    }
}
