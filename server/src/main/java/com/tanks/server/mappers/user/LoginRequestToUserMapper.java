package com.tanks.server.mappers.user;

import com.tanks.server.dto.auth.LoginRequest;
import com.tanks.server.entities.User;

import java.util.function.Function;

public class LoginRequestToUserMapper implements Function<LoginRequest, User> {
    @Override
    public User apply(LoginRequest loginRequest) {
        return User.builder()
                .password(loginRequest.getPassword())
                .username(loginRequest.getUsername())
                .build();
    }
}
