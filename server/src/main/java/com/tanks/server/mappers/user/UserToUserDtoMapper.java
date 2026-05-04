package com.tanks.server.mappers.user;

import com.tanks.server.dto.UserDto;
import com.tanks.server.entities.User;

import java.util.function.Function;

public class UserToUserDtoMapper implements Function<User, UserDto> {

    @Override
    public UserDto apply(User user) {
        return new UserDto(user.getId(),user.getUsername());
    }
}
