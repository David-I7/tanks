package com.tanks.server.controllers;

import com.tanks.server.dto.auth.RefreshTokenResponse;
import com.tanks.server.dto.auth.RegisterRequest;
import com.tanks.server.entities.User;
import com.tanks.server.mappers.user.RegisterRequestToUserMapper;
import com.tanks.server.mappers.user.UserToUserDtoMapper;
import com.tanks.server.security.services.JwtService;
import com.tanks.server.services.AuthService;
import com.tanks.server.services.UserService;
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

@RestController
@RequestMapping("/api/v1/auth")
@AllArgsConstructor
public class AuthController {

    private UserService userService;

    private JwtService jwtService;

    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<RefreshTokenResponse> register(@Valid @RequestBody RegisterRequest request){
        User user = new RegisterRequestToUserMapper().apply(request);

        userService.register(user);

        String accessToken = jwtService.generateAccessToken(user.getUsername(), Map.of("id",user.getId()));
        String refreshToken = jwtService.generateRefreshToken(user.getUsername(),Map.of());

        ResponseCookie refreshCookie = authService.createRefreshCookie(refreshToken);

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE,refreshCookie.toString())
                .body(new RefreshTokenResponse(accessToken,new UserToUserDtoMapper().apply(user)));
    }



}
