package com.tanks.server.services;

import com.tanks.server.dto.auth.LoginRequest;
import com.tanks.server.dto.auth.RefreshTokenResponse;
import com.tanks.server.entities.User;
import com.tanks.server.model.JwtSession;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;


@Service
@AllArgsConstructor
public class AuthService {

    private UserService userService;

    private JwtSessionService jwtSessionService;

    private PasswordEncoder passwordEncoder;

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

        if (!Objects.equals(passwordEncoder.encode(loginRequest.getPassword()), user.getPassword())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Incorrect password");
        }

        return jwtSessionService.createSession(user);
    }

    public ResponseCookie deleteSession(String refreshToken){
        jwtSessionService.revokeRefreshToken(refreshToken);
        return jwtSessionService.expireRefreshCookie(refreshToken);
    }
}
