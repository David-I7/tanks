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
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
                .body(new RefreshTokenResponse(session.accessToken(),session.userDto()));
    }

    @PostMapping("/login")
    public ResponseEntity<RefreshTokenResponse> login(@Valid @RequestBody LoginRequest loginRequest){

        User user;
        if(loginRequest.getUsername() != null){
            user = userService.findByUsername(loginRequest.getUsername());
        }else{
            user = userService.findByEmail(loginRequest.getEmail());
        }

        JwtSession session = authService.createSession(user);

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE,session.cookie().toString())
                .body(new RefreshTokenResponse(session.accessToken(),session.userDto()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<RefreshTokenResponse> refresh(@CookieValue("refreshToken") String refreshToken){
        JwtSession newSession = authService.rollingSession(refreshToken);

        if(newSession != null){
            return ResponseEntity
                    .ok()
                    .header(HttpHeaders.SET_COOKIE,newSession.cookie().toString())
                    .body(new RefreshTokenResponse(newSession.accessToken(),newSession.userDto()));
        }else{
            return ResponseEntity.ok(authService.refresh(refreshToken));
        }

    }
}
