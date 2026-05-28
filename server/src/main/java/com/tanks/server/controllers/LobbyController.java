package com.tanks.server.controllers;

import com.tanks.server.dto.UserDto;
import com.tanks.server.dto.lobby.LobbyResponseDto;
import com.tanks.server.entities.lobby.Lobby;
import com.tanks.server.entities.lobby.LobbyType;
import com.tanks.server.mappers.user.UserDtoToUserMapper;
import com.tanks.server.services.LobbyService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.UUID;

@Controller
@RequestMapping("/api/v1/lobby")
public class LobbyController {

    private LobbyService lobbyService;

    private UserDtoToUserMapper userDtoToUserMapper = new UserDtoToUserMapper();

    public LobbyController(LobbyService lobbyService){
        this.lobbyService = lobbyService;
    }

    @PostMapping
    public ResponseEntity<LobbyResponseDto> createLobby(Authentication authentication){
        UserDto userDto = (UserDto) authentication.getPrincipal();

        Lobby lobby = lobbyService.create(LobbyType.PRIVATE,userDtoToUserMapper.apply(userDto));

        return ResponseEntity.created(
                ServletUriComponentsBuilder
                        .fromCurrentRequestUri()
                        .path("/{id}")
                        .buildAndExpand(lobby.getId())
                        .toUri()
        ).body(new LobbyResponseDto(lobby.getId()));
    }

    @PostMapping("/{id}")
    public ResponseEntity<LobbyResponseDto> canJoinPrivateLobby(@PathVariable UUID id,Authentication authentication){
        UserDto userDto = (UserDto) authentication.getPrincipal();

        lobbyService.join(id,userDtoToUserMapper.apply(userDto));

        return ResponseEntity.ok(new LobbyResponseDto(id));
    }
}
