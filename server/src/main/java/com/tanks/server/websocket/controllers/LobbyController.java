package com.tanks.server.websocket.controllers;

import com.tanks.server.dto.UserDto;
import com.tanks.server.websocket.dto.lobby.LobbyResponseDto;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.mappers.user.UserDtoToUserMapper;
import com.tanks.server.websocket.services.LobbyService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.util.UUID;

@Controller
public class LobbyController {

    private LobbyService lobbyService;

    private UserDtoToUserMapper userDtoToUserMapper = new UserDtoToUserMapper();

    public LobbyController(LobbyService lobbyService){
        this.lobbyService = lobbyService;
    }

    @MessageMapping("/lobby/create")
    @SendToUser("/queue/replies")
    public LobbyResponseDto createLobby(Authentication authentication){
        UserDto userDto = (UserDto) authentication.getPrincipal();

        Lobby lobby = lobbyService.create(LobbyType.PRIVATE,userDtoToUserMapper.apply(userDto));

        return new LobbyResponseDto(lobby.getId());
    }

    @MessageMapping("/lobby/join/{id}")
    @SendToUser("/queue/replies")
    public LobbyResponseDto joinPrivateLobby(@DestinationVariable UUID id, Authentication authentication){
        UserDto userDto = (UserDto) authentication.getPrincipal();

        lobbyService.join(id,userDtoToUserMapper.apply(userDto));

        return new LobbyResponseDto(id);
    }

    @MessageMapping("/lobby/quick-match")
    @SendToUser("/queue/replies")
    public void joinQuickMatch(){

    }

}
