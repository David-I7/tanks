package com.tanks.server.dto.auth;


import com.tanks.server.dto.UserDto;
import com.tanks.server.websocket.dto.UserSessionStatusDto;

public record AuthStatusResponseDto(UserDto user, UserSessionStatusDto userSessionStatus){
}
