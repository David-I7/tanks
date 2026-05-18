package com.tanks.server.controllers;

import com.tanks.server.dto.auth.*;
import com.tanks.server.entities.User;
import com.tanks.server.mappers.user.RegisterRequestToUserMapper;
import com.tanks.server.model.JwtSession;
import com.tanks.server.services.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;


@Controller
@RequestMapping("/api/v1/auth")
public class AuthController {

    private AuthService authService;

    @Value("${app.isDev:false}")
    private boolean isDev;

    @Value("${app.client.origin}")
    private String clientOrigin;

    public AuthController(AuthService authService){
        this.authService = authService;

    }

    @PostMapping("/register/password")
    public ResponseEntity<RefreshTokenResponse> register(@Valid @RequestBody RegisterRequest request){
        User user = new RegisterRequestToUserMapper().apply(request);

        JwtSession session = authService.register(user);

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE,session.cookie().toString())
                .body(new RefreshTokenResponse(session.accessToken(),session.userDto()));
    }

    @PostMapping("/register/postOAuth2")
    public ResponseEntity<RefreshTokenResponse> postOAuth2Register(@Valid @RequestBody PostOAuth2RegisterRequest request){

        JwtSession session = authService.postOAuth2Register(request);

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE,session.cookie().toString())
                .body(new RefreshTokenResponse(session.accessToken(),session.userDto()));
    }

    @PostMapping("/login/password")
    public ResponseEntity<RefreshTokenResponse> login(@Valid @RequestBody LoginRequest loginRequest){

        JwtSession session = authService.login(loginRequest);

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE,session.cookie().toString())
                .body(new RefreshTokenResponse(session.accessToken(),session.userDto()));
    }

    @PostMapping("/login/postOAuth2")
    public ResponseEntity<RefreshTokenResponse> postOAuth2Login(@Valid @RequestBody PostOAuth2LoginRequest loginRequest){

        JwtSession session = authService.postOAuth2Login(loginRequest);

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
    public String oauth2LoginResponse(Model model, HttpSession session, HttpServletRequest request){
        OAuth2LoginResponse response = (OAuth2LoginResponse) session.getAttribute("oauth2LoginResponse");
        model.addAttribute("oauth2LoginResponse",response);

        if(isDev){
            model.addAttribute("origin",clientOrigin);
        }else{
            String origin = UriComponentsBuilder.newInstance()
                    .scheme(request.getScheme())
                    .host(request.getServerName())
                    .port(
                            (request.getServerPort() == 80 || request.getServerPort() == 443)
                                    ? null
                                    : request.getServerPort()
                    )
                    .build()
                    .toUriString();
            model.addAttribute("origin",origin);
        }

        return "OAuth2LoginResponse";
    }
}
