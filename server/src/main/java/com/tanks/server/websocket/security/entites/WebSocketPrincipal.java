package com.tanks.server.websocket.security.entites;

import com.tanks.server.dto.UserDto;
import com.tanks.server.websocket.entities.userSession.UserSession;
import lombok.Getter;
import lombok.Setter;

import java.security.Principal;

@Getter
public class WebSocketPrincipal implements Principal {

    private UserDto userDto;

    @Setter
    private UserSession userSession;

    public WebSocketPrincipal(UserDto userDto){
        this.userDto = userDto;
    }

    @Override
    public String getName() {
        return userDto.username();
    }
}
