package com.tanks.server.controllers;

import com.tanks.server.dto.RefreshResponse;
import com.tanks.server.dto.RegisterRequest;
import com.tanks.server.dto.UserDto;
import com.tanks.server.entities.User;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.security.services.JwtService;
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

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@AllArgsConstructor
public class AuthController {

    private JwtService jwtService;

    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<RefreshResponse> register(@Valid @RequestBody RegisterRequest request){
        User user = User.builder()
                .password(request.getPassword())
                .username(request.getUsername())
                .build();

        userService.register(user);

        String accessToken = jwtService.generateAccessToken(user.getUsername(), Map.of("id",user.getId()));
        String refreshToken = jwtService.generateRefreshToken(user.getUsername(),Map.of());

        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)       // prevents JS access (XSS protection)
                .secure(true)         // ONLY over HTTPS (set false for local dev if needed)
                .path("/auth/refresh") // limit where cookie is sent (good practice)
                .maxAge(Duration.ofDays(7)) // match your refresh token TTL
                .sameSite("Strict")   // or "Lax" depending on your frontend setup
                .build();


        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE,refreshCookie.toString())
                .body(new RefreshResponse(accessToken,new UserDto(user.getId(), user.getUsername())));
    }

}
