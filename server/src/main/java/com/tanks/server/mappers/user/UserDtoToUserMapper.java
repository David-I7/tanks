package com.tanks.server.mappers.user;

import com.tanks.server.dto.UserDto;
import com.tanks.server.entities.User;

import java.util.function.Function;

public class UserDtoToUserMapper implements Function<UserDto, User> {
    @Override
    public User apply(UserDto userDto) {
        return User.builder()
                .email(userDto.email())
                .username(userDto.username())
                .id(userDto.id())
                .build();
    }
}
