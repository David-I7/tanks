package com.tanks.server.services;

import com.tanks.server.dto.UserDto;
import com.tanks.server.dto.auth.LoginRequest;
import com.tanks.server.dto.auth.PostOAuth2LoginRequest;
import com.tanks.server.dto.auth.PostOAuth2RegisterRequest;
import com.tanks.server.dto.auth.RefreshTokenResponse;
import com.tanks.server.entities.User;
import com.tanks.server.exceptions.InvalidJwtException;
import com.tanks.server.security.model.JwtSession;
import com.tanks.server.security.mappers.ClaimsToUserDtoMapper;
import com.tanks.server.security.services.JwtService;
import com.tanks.server.security.services.JwtSessionService;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;


@Service
public class AuthService {

    private UserService userService;

    private JwtSessionService jwtSessionService;

    private JwtService jwtService;

    private PasswordEncoder passwordEncoder;

    private ClaimsToUserDtoMapper claimsToUserDtoMapper = new ClaimsToUserDtoMapper();

    public AuthService(  UserService userService, JwtSessionService jwtSessionService, JwtService jwtService, PasswordEncoder passwordEncoder){
            this.jwtSessionService = jwtSessionService;
            this.userService = userService;
            this.jwtService = jwtService;
            this.passwordEncoder = passwordEncoder;
    }

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

        if (!passwordEncoder.matches(loginRequest.getPassword(),user.getPassword())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Incorrect password");
        }

        return jwtSessionService.createSession(user);
    }

    public ResponseCookie deleteSession(String refreshToken){
        jwtSessionService.revokeRefreshToken(refreshToken);
        return jwtSessionService.expireRefreshCookie(refreshToken);
    }

    public JwtSession postOAuth2Login(PostOAuth2LoginRequest loginRequest){
        try {
            Claims claims = jwtService.parseClaims(loginRequest.getToken());
            String email = claims.getSubject();
            User user = userService.findByEmail(email);
            return jwtSessionService.createSession(user);
        }catch (InvalidJwtException e){
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, e.getMessage());
        }
    }

    public JwtSession postOAuth2Register(PostOAuth2RegisterRequest registerRequest){
        try{
            Claims claims = jwtService.parseClaims(registerRequest.getToken());
            String email = claims.getSubject();
            User user  = User.builder()
                    .email(email)
                    .username(registerRequest.getUsername())
                    .build();

            userService.register(user);

            return jwtSessionService.createSession(user);

        }catch (InvalidJwtException e){
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,e.getMessage());
        }
    }

    public UserDto parseUser(String accessToken){
        try{
            Claims claims = jwtService.parseClaims(accessToken);
            return claimsToUserDtoMapper.apply(claims);
        }catch (InvalidJwtException e){
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,e.getMessage());
        }
    }
}
