package com.tanks.server.websocket.listeners;

import com.tanks.server.dto.UserDto;
import com.tanks.server.mappers.user.UserDtoToUserMapper;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.game.GameLobbyPayload;
import com.tanks.server.websocket.dto.lobby.LobbyEventResponseDto;
import com.tanks.server.websocket.dto.lobby.LobbyEventType;
import com.tanks.server.websocket.dto.lobby.LobbyEventPayload;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.security.services.WebSocketAuthorizationService;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.LobbyService;
import com.tanks.server.websocket.services.UserSessionService;
import com.tanks.server.websocket.events.GameEvent;
import com.tanks.server.websocket.events.LobbyEvent;
import com.tanks.server.websocket.events.WebSocketEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.*;

import java.util.UUID;

@Component
@Slf4j
public class WebSocketEventListeners {

    private static final String TOPIC_LOBBY = "/topic/lobby/";

    private static final String TOPIC_GAME = "/topic/game/";

    private final SimpMessagingTemplate simpMessagingTemplate;

    private UserDtoToUserMapper userDtoToUserMapper = new UserDtoToUserMapper();

    private LobbyService lobbyService;

    private GameSessionService gameService;

    private UserSessionService userSessionService;


    public WebSocketEventListeners(LobbyService lobbyService, UserSessionService userSessionService, SimpMessagingTemplate simpMessagingTemplate){
        this.lobbyService = lobbyService;
        this.userSessionService = userSessionService;
        this.simpMessagingTemplate = simpMessagingTemplate;
    }

    @EventListener
    public void handleLobbyEvent(LobbyEvent event) {
        if (event.getUsername() != null) {
            simpMessagingTemplate.convertAndSendToUser(event.getUsername(), event.getDestination(), event.getPayload());
        } else {
            simpMessagingTemplate.convertAndSend(event.getDestination(), event.getPayload());
        }
    }

    @EventListener
    public void handleGameEvent(GameEvent event) {
        if (event.getUsername() != null) {
            simpMessagingTemplate.convertAndSendToUser(event.getUsername(), event.getDestination(), event.getPayload());
        } else {
            simpMessagingTemplate.convertAndSend(event.getDestination(), event.getPayload());
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {

        StompHeaderAccessor accessor =
                StompHeaderAccessor.wrap(event.getMessage());

        if(accessor.getUser() == null) return;

        WebSocketPrincipal principal = (WebSocketPrincipal) ((WebSocketAuthentication)accessor.getUser()).getPrincipal();

        UserDto user = principal.getUserDto();
        UserSession userSession = principal.getUserSession();

        if(userSession != null) {
            if (userSession.getState() == UserSessionState.IN_LOBBY) {
                // notify lobby that the user disconnected
                log.debug("LOBBY DISCONNECT");
                lobbyService.removeUser(userSession.getLobbyId(), userDtoToUserMapper.apply(user));
                userSessionService.delete(userSession);
                if(userSession.isConnectedToTopic()) {
                    simpMessagingTemplate.convertAndSend("/topic/lobby/" + userSession.getLobbyId(), new LobbyEventResponseDto(LobbyEventType.LOBBY_DISCONNECT, "@SERVER", new LobbyEventPayload(userSession.getLobbyId(), user.username())));
                }
            } else if (userSession.getState() == UserSessionState.IN_GAME) {
                // handle game disconnect
                log.debug("GAME DISCONNECT");
                userSession.setConnectedToTopic(false);
                userSessionService.save(userSession);
                if(userSession.isConnectedToTopic()) {
                    simpMessagingTemplate.convertAndSend("/topic/game/" + userSession.getGameSessionId(), new GameEventResponseDto(GameEventType.GAME_DISCONNECT, "@SERVER", new LobbyEventPayload(userSession.getGameSessionId(), user.username())));
                }
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

        WebSocketAuthentication authentication =  (WebSocketAuthentication)accessor.getUser();

        if(accessor.getDestination().startsWith(TOPIC_LOBBY)){
            UserSession userSession = ((WebSocketPrincipal)authentication.getPrincipal()).getUserSession();

            userSession.setConnectedToTopic(true);
            userSessionService.save(userSession);

            log.debug("LOBBY CONNECT");

            simpMessagingTemplate.convertAndSend(
                    accessor.getDestination(),
                    new LobbyEventResponseDto(
                            LobbyEventType.LOBBY_CONNECT,
                            "@SERVER",
                            new LobbyEventPayload(
                                    UUID.fromString(accessor.getDestination().substring(TOPIC_LOBBY.length())),
                                    authentication.getName()
                            )
                    )
            );

        } else if (accessor.getDestination().startsWith(TOPIC_GAME)) {

            UserSession userSession = ((WebSocketPrincipal)authentication.getPrincipal()).getUserSession();

            userSession.setConnectedToTopic(true);
            userSessionService.save(userSession);

            log.debug("GAME CONNECT");

            simpMessagingTemplate.convertAndSend(
                    accessor.getDestination(),
                    new GameEventResponseDto(
                            GameEventType.GAME_CONNECT,
                            "@SERVER",
                            new GameLobbyPayload(
                                    UUID.fromString(accessor.getDestination().substring(TOPIC_GAME.length())),
                                    authentication.getName()
                            )
                    )
            );

        }
    }

}
