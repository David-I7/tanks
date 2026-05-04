package com.tanks.server.security.mappers;

import com.tanks.server.dto.UserDto;
import io.jsonwebtoken.Claims;

import java.util.function.Function;

public class ClaimsToUserDtoMapper implements Function<Claims, UserDto> {

    @Override
    public UserDto apply(Claims claims) {
        return new UserDto(claims.get("id",Long.class),claims.getSubject());
    }
}
