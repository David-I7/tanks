package com.tanks.server.websocket.controllers;

import com.tanks.server.dto.UserDto;
import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.lobby.LobbyEventResponseDto;
import com.tanks.server.websocket.dto.lobby.LobbyEventType;
import com.tanks.server.websocket.dto.lobby.LobbyEventPayload;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.mappers.user.UserDtoToUserMapper;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.LobbyService;
import com.tanks.server.websocket.services.UserSessionService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.util.Optional;
import java.util.UUID;

@Controller
public class LobbyController {

    private LobbyService lobbyService;

    private final UserSessionService userSessionService;

    private UserDtoToUserMapper userDtoToUserMapper = new UserDtoToUserMapper();

    public LobbyController(LobbyService lobbyService, UserSessionService userSessionService){
        this.lobbyService = lobbyService;
        this.userSessionService = userSessionService;

    }

    @PreAuthorize("@webSocketAuthorizationService.canJoinOrCreateLobby(authentication, '/lobby/create/private')")
    @MessageMapping("/lobby/create/private")
    @SendToUser("/queue/replies")
    public LobbyEventResponseDto createLobby(Authentication authentication){
        WebSocketPrincipal principal = (WebSocketPrincipal)authentication.getPrincipal();
        UserDto userDto = principal.getUserDto();
        UserSession userSession = principal.getUserSession();

        // Create private lobby
        UUID uuid = IdFactory.randomUUID();
        Lobby lobby = Lobby.builder()
                .hostId(userDto.id())
                .type(LobbyType.PRIVATE)
                .status(LobbyStatus.WAITING_FOR_OPPONENT)
                .id(uuid)
                .build();

        lobbyService.create(lobby);

        userSession.setState(UserSessionState.IN_LOBBY);
        userSession.setLobbyId(uuid);
        userSessionService.save(userSession);

        return new LobbyEventResponseDto(LobbyEventType.LOBBY_CREATED, "@SERVER",new LobbyEventPayload(uuid, userDto.username()));
    }

    @PreAuthorize("@webSocketAuthorizationService.canJoinOrCreateLobby(authentication, '/lobby/join/private/' + #id)")
    @MessageMapping("/lobby/join/private/{id}")
    @SendToUser("/queue/replies")
    public LobbyEventResponseDto joinPrivateLobby(@DestinationVariable UUID id, Authentication authentication){
        WebSocketPrincipal principal = (WebSocketPrincipal)authentication.getPrincipal();
        UserDto userDto = principal.getUserDto();
        UserSession userSession = principal.getUserSession();

        // Join private lobby
        lobbyService.join(id, userDtoToUserMapper.apply(userDto));

        userSession.setState(UserSessionState.IN_LOBBY);
        userSession.setLobbyId(id);
        userSessionService.save(userSession);

        return new LobbyEventResponseDto(LobbyEventType.LOBBY_JOINED, "@SERVER",new LobbyEventPayload(id, userDto.username()));
    }

    @PreAuthorize("@webSocketAuthorizationService.canJoinOrCreateLobby(authentication, '/lobby/quick-match')")
    @MessageMapping("/lobby/quick-match")
    @SendToUser("/queue/replies")
    public LobbyEventResponseDto joinQuickMatch(Authentication authentication){
        WebSocketPrincipal principal = (WebSocketPrincipal)authentication.getPrincipal();
        UserDto userDto = principal.getUserDto();
        UserSession userSession = principal.getUserSession();

        Optional<Lobby> lobby = lobbyService.findBestQuickMatch();

        if(lobby.isPresent()){
            Lobby quickMatchLobby = lobby.get();
            lobbyService.join(quickMatchLobby.getId(), userDtoToUserMapper.apply(userDto));
            lobbyService.removeQuickMatch(quickMatchLobby);

            userSession.setState(UserSessionState.IN_LOBBY);
            userSession.setLobbyId(quickMatchLobby.getId());
            userSessionService.save(userSession);

            return new LobbyEventResponseDto(LobbyEventType.LOBBY_JOINED,"@SERVER",new LobbyEventPayload(quickMatchLobby.getId(), userDto.username()));
        } else {
            UUID uuid = IdFactory.randomUUID();
            Lobby quickMatchLobby = Lobby.builder()
                    .id(uuid)
                    .hostId(userDto.id())
                    .type(LobbyType.QUICK_MATCH)
                    .status(LobbyStatus.WAITING_FOR_OPPONENT)
                    .build();

            lobbyService.create(quickMatchLobby);

            userSession.setState(UserSessionState.IN_LOBBY);
            userSession.setLobbyId(quickMatchLobby.getId());
            userSessionService.save(userSession);

            return new LobbyEventResponseDto(LobbyEventType.LOBBY_CREATED,"@SERVER",new LobbyEventPayload(quickMatchLobby.getId(), userDto.username()));
        }
    }

}
