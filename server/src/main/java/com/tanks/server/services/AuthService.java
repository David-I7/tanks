package com.tanks.server.services;

import com.tanks.server.dto.auth.LoginRequest;
import com.tanks.server.dto.auth.RefreshTokenResponse;
import com.tanks.server.entities.User;
import com.tanks.server.model.JwtSession;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@AllArgsConstructor
public class AuthService {

    private UserService userService;

    private JwtSessionService jwtSessionService;

    @Transactional
    public JwtSession register(User user) {
        userService.register(user);
        return jwtSessionService.createSession(user);
    }

    public boolean shouldRollSession(String refreshToken){
        return jwtSessionService.shouldCreateNewSession(refreshToken);
    }

    public RefreshTokenResponse refresh(String refreshToken){
        return jwtSessionService.refresh(refreshToken);
    }

    public JwtSession createSession(User user){
        return jwtSessionService.createSession(user);
    }

    public JwtSession extendSession(String refreshToken){
        return jwtSessionService.extendSession(refreshToken);
    }

    public JwtSession login(LoginRequest loginRequest){
        User user;
        if(loginRequest.getUsername() != null){
            user = userService.findByUsername(loginRequest.getUsername());
        }else{
            user = userService.findByEmail(loginRequest.getEmail());
        }

        return jwtSessionService.createSession(user);
    }

    public ResponseCookie deleteSession(String refreshToken){
        jwtSessionService.revokeRefreshToken(refreshToken);
        return jwtSessionService.expireRefreshCookie(refreshToken);
    }
}
