package com.tanks.server.mappers.user;

import com.tanks.server.dto.auth.RegisterRequest;
import com.tanks.server.entities.User;

import java.util.function.Function;

public class RegisterRequestToUserMapper implements Function<RegisterRequest, User> {
    @Override
    public User apply(RegisterRequest registerRequest) {
        return User.builder()
                .password(registerRequest.getPassword())
                .username(registerRequest.getUsername())
                .build();
    }
}
