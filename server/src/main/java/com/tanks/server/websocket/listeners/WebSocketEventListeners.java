package com.tanks.server.websocket.listeners;

import com.tanks.server.dto.UserDto;
import com.tanks.server.mappers.user.UserDtoToUserMapper;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.lobby.LobbyEventResponseDto;
import com.tanks.server.websocket.dto.lobby.LobbyEventType;
import com.tanks.server.websocket.dto.lobby.LobbyIdPayload;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.security.services.WebSocketAuthorizationService;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.LobbyService;
import com.tanks.server.websocket.services.UserSessionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.*;

import java.util.UUID;

@Component
@Slf4j
public class WebSocketEventListeners {

    private static final String TOPIC_LOBBY = "/topic/lobby/";

    private final SimpMessagingTemplate simpMessagingTemplate;

    private UserDtoToUserMapper userDtoToUserMapper;

    private LobbyService lobbyService;

    private GameSessionService gameService;

    private UserSessionService userSessionService;

    private WebSocketAuthorizationService webSocketAuthorizationService;

    public WebSocketEventListeners(LobbyService lobbyService, UserSessionService userSessionService, WebSocketAuthorizationService webSocketAuthorizationService, SimpMessagingTemplate simpMessagingTemplate){
        this.lobbyService = lobbyService;
        this.webSocketAuthorizationService = webSocketAuthorizationService;
        this.userSessionService = userSessionService;
        this.simpMessagingTemplate = simpMessagingTemplate;
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {

        log.debug("WEBSOCKET DISCONNECT");
        StompHeaderAccessor accessor =
                StompHeaderAccessor.wrap(event.getMessage());

        if(accessor.getUser() == null) return;

        WebSocketPrincipal principal = (WebSocketPrincipal) ((WebSocketAuthentication)accessor.getUser()).getPrincipal();

        UserDto user = principal.getUserDto();
        UserSession userSession = principal.getUserSession();

        if(userSession != null) {
            if (userSession.getState() == UserSessionState.IN_LOBBY) {
                // notify lobby that the user disconnected
                lobbyService.removeUser(userSession.getLobbyId(), userDtoToUserMapper.apply(user));
                userSessionService.delete(userSession);
                simpMessagingTemplate.convertAndSend("/topic/lobby/" + userSession.getLobbyId(), new LobbyEventResponseDto(LobbyEventType.LOBBY_DISCONNECT, user.username(), null));
            } else if (userSession.getState() == UserSessionState.IN_GAME) {
                // handle game disconnect
                userSessionService.save(userSession);
                simpMessagingTemplate.convertAndSend("/topic/game/" + userSession.getGameSessionId(), new GameEventResponseDto(GameEventType.GAME_DISCONNECT, user.username(), null));
            } else {
                // handle tab close or general disconnect events
                userSessionService.delete(userSession);
            }
        }

        log.debug("User '{}' disconnected", user.username());
    }

    @EventListener
    public void handleLobbyConnect(SessionSubscribeEvent event){
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        if(accessor.getDestination() == null) return;

        if(accessor.getDestination().startsWith(TOPIC_LOBBY)){
            log.debug("LOBBY CONNECT");
            WebSocketAuthentication authentication =  (WebSocketAuthentication)accessor.getUser();

            if(webSocketAuthorizationService.canJoinLobby(authentication, accessor.getDestination())){
                simpMessagingTemplate.convertAndSend(
                        accessor.getDestination(),
                        new LobbyEventResponseDto(
                                LobbyEventType.LOBBY_CONNECT,
                                authentication.getName(),
                                new LobbyIdPayload(
                                        UUID.fromString(accessor.getDestination().substring(TOPIC_LOBBY.length()))
                                )
                        )
                );
            };
        }
    }

    @EventListener
    public void handleLobbyDisconnect(SessionUnsubscribeEvent event){
        log.debug("LOBBY DISCONNECT");

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

//        if(accessor.getDestination().startsWith("/topic/lobby/")){
//            WebSocketPrincipal principal = (WebSocketPrincipal) ((WebSocketAuthentication)accessor.getUser()).getPrincipal();
//
//            UserDto user = principal.getUserDto();
//            UserSession userSession = principal.getUserSession();
//
//            if(userSession.getState() == UserSessionState.IN_LOBBY){
//                // notify lobby that the user disconnected
//                lobbyService.removeUser(userSession.getLobbyId(),userDtoToUserMapper.apply(user));
//                userSessionService.delete(userSession);
//                simpMessagingTemplate.convertAndSend("/topic/lobby/" + userSession.getLobbyId(), new LobbyEventResponseDto(LobbyEventType.LOBBY_DISCONNECT, user.username(),null));
//            }
//        }
    }



}
