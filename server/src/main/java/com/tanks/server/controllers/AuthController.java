package com.tanks.server.controllers;

import com.tanks.server.dto.auth.LoginRequest;
import com.tanks.server.dto.auth.OAuth2LoginResponse;
import com.tanks.server.dto.auth.RefreshTokenResponse;
import com.tanks.server.dto.auth.RegisterRequest;
import com.tanks.server.entities.User;
import com.tanks.server.mappers.user.RegisterRequestToUserMapper;
import com.tanks.server.model.JwtSession;
import com.tanks.server.services.AuthService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Controller
@RequestMapping("/api/v1/auth")
@AllArgsConstructor
public class AuthController {

    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<RefreshTokenResponse> register(@Valid @RequestBody RegisterRequest request){
        User user = new RegisterRequestToUserMapper().apply(request);

        JwtSession session = authService.register(user);

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE,session.cookie().toString())
                .body(new RefreshTokenResponse(session.accessToken(),session.userDto()));
    }

    @PostMapping("/login")
    public ResponseEntity<RefreshTokenResponse> login(@Valid @RequestBody LoginRequest loginRequest){

        JwtSession session = authService.login(loginRequest);

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE,session.cookie().toString())
                .body(new RefreshTokenResponse(session.accessToken(),session.userDto()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<RefreshTokenResponse> refresh(@CookieValue("refreshToken") String refreshToken){

        if(authService.shouldRollSession(refreshToken)){
            JwtSession newSession = authService.extendSession(refreshToken);
            return ResponseEntity
                    .ok()
                    .header(HttpHeaders.SET_COOKIE,newSession.cookie().toString())
                    .body(new RefreshTokenResponse(newSession.accessToken(),newSession.userDto()));
        }else{
            return ResponseEntity.ok(authService.refresh(refreshToken));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue("refreshToken") String refreshToken){
        ResponseCookie expiredCookie = authService.deleteSession(refreshToken);

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE,expiredCookie.toString())
                .build();
    }

    @GetMapping("/login/oauth2/response")
    public String oauth2LoginResponse(Model model, HttpSession session){
        OAuth2LoginResponse response = (OAuth2LoginResponse) session.getAttribute("oauth2LoginResponse");

        model.addAttribute("oauth2LoginResponse",response);

        return "OAuth2LoginResponse";
    }
}
