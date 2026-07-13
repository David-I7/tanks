package com.tanks.server.websocket.listeners;

import com.tanks.server.dto.UserDto;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.game.GameIdPayload;
import com.tanks.server.websocket.dto.lobby.LobbyEventResponseDto;
import com.tanks.server.websocket.dto.lobby.LobbyEventType;
import com.tanks.server.websocket.dto.lobby.LobbyEventPayload;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.LobbyService;
import com.tanks.server.websocket.services.UserSessionService;
import com.tanks.server.websocket.services.ClaimService;
import com.tanks.server.websocket.events.GameEvent;
import com.tanks.server.websocket.events.LobbyEvent;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.events.WebSocketEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.*;

import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class WebSocketEventListeners {

    private static final String TOPIC_LOBBY = "/topic/lobby/";

    private static final String TOPIC_GAME = "/topic/game/";

    private static final String TOPIC_USER_ERRORS = "/user/queue/errors";

    private static final String TOPIC_USER_REPLIES = "/user/queue/replies";

    private final SimpMessagingTemplate simpMessagingTemplate;

    private final LobbyService lobbyService;

    private final GameSessionService gameSessionService;

    private final UserSessionService userSessionService;

    private final ClaimService claimService;

    public WebSocketEventListeners(GameSessionService gameSessionService, LobbyService lobbyService, UserSessionService userSessionService, ClaimService claimService, SimpMessagingTemplate simpMessagingTemplate){
        this.lobbyService = lobbyService;
        this.gameSessionService = gameSessionService;
        this.userSessionService = userSessionService;
        this.claimService = claimService;
        this.simpMessagingTemplate = simpMessagingTemplate;
    }

    @EventListener
    public void handleLobbyEvent(LobbyEvent event) {
        send(event);
    }

    @EventListener
    public void handleGameEvent(GameEvent event) {
        send(event);
    }

    @EventListener
    public void handleOnlineGameplayEvent(OnlineGameplayEvent event) {
        send(event);
    }

    private void send(WebSocketEvent<?> event) {
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
        
        claimService.releaseSocket(user.id(), event.getSessionId());
        
        UserSession userSession = null;
        try {
            userSession = userSessionService.findById(user.id());
            principal.setUserSession(userSession);
        } catch (Exception ex) {
            log.debug("User session already deleted or not found for user '{}'", user.username());
        }

        // UserSession is null if the user failed to connect on the CONNECT command
        if(userSession != null) {
            if (userSession.getState() == UserSessionState.IN_LOBBY) {
                // notify lobby that the user left
                log.debug("LOBBY LEAVE");
                handleLobbyLeave(userSession);
            } else if (userSession.getState() == UserSessionState.IN_GAME) {
                // handle game disconnect
                log.debug("GAME DISCONNECT");
                handleGameDisconnect(userSession);
            } else {
                // handle tab close or general disconnect events
                userSessionService.delete(userSession);
            }
        }

        log.debug("User '{}' disconnected", user.username());
    }

    @EventListener
    public void handleSubscribe(SessionSubscribeEvent event){
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        if(accessor.getDestination() == null) return;

        WebSocketAuthentication authentication =  (WebSocketAuthentication)accessor.getUser();

        if(accessor.getDestination().startsWith(TOPIC_LOBBY)){

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

            log.debug("GAME CONNECT");

            simpMessagingTemplate.convertAndSend(
                    accessor.getDestination(),
                    new GameEventResponseDto(
                            GameEventType.GAME_CONNECT,
                            "@SERVER",
                            new GameIdPayload(
                                    UUID.fromString(accessor.getDestination().substring(TOPIC_GAME.length())),
                                    authentication.getName()
                            )
                    )
            );

            UserSession userSession = ((WebSocketPrincipal)authentication.getPrincipal()).getUserSession();

            GameSession gameSession = gameSessionService.getAndIncrementPlayerCount(userSession.getGameSessionId());

            if(gameSession.getConnectedPlayerCount() == 2 && gameSession.getState().equals(GameSessionState.CREATED)){
                gameSessionService.startGame(gameSession);
            }
        }
    }

    @EventListener
    public void handleUnsubscribe(SessionUnsubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        if(accessor.getUser() == null) return;

        WebSocketPrincipal principal = (WebSocketPrincipal) ((WebSocketAuthentication)accessor.getUser()).getPrincipal();

        UserDto user = principal.getUserDto();
        UserSession userSession = null;
        try {
            userSession = userSessionService.findById(user.id());
            principal.setUserSession(userSession);
        } catch (Exception ex) {
            log.debug("User session already deleted or not found for user '{}'", user.username());
        }

        if(userSession != null){
            String subscriptionId = accessor.getSubscriptionId();

            Map<String, String> topics = userSession.getTopicSubscriptions();
            if(topics == null || topics.isEmpty()) return;

            var topicEntry =  topics.entrySet().stream()
                    .filter(entry -> entry.getValue().equals(subscriptionId))
                    .findFirst().orElse(null);

            if(topicEntry == null) return;

            String topic = topicEntry.getKey();

            if(topic.startsWith(TOPIC_LOBBY)){
                log.debug("LOBBY UNSUBSCRIBE");
                handleLobbyUnsubscribe(userSession);
            } else if (topic.startsWith(TOPIC_GAME)) {
                log.debug("GAME UNSUBSCRIBE");
                handleGameDisconnect(userSession);
            }else if (topic.startsWith(TOPIC_USER_ERRORS)) {
                log.debug("USER ERRORS UNSUBSCRIBE");
                handleUserErrorsUnsubscribe(userSession);
            }else if (topic.startsWith(TOPIC_USER_REPLIES)) {
                log.debug("USER REPLIES UNSUBSCRIBE");
                handleUserRepliesUnsubscribe(userSession);
            }
        }
    }

    private void handleLobbyLeave(UserSession userSession){
        lobbyService.removeUser(userSession);
        userSessionService.delete(userSession);
    }

    private void handleGameDisconnect(UserSession userSession){
        if(userSessionService.isConnectedToGame(userSession)) {
            String gameTopic = "/topic/game/" + userSession.getGameSessionId();
            userSession.setTopicSubscriptions(null);
            userSession.setSocketSessionId(null);
            userSessionService.save(userSession);
            gameSessionService.decremenentPlayerCount(userSession.getGameSessionId());
            simpMessagingTemplate.convertAndSend(gameTopic, new GameEventResponseDto(GameEventType.GAME_DISCONNECT, "@SERVER", new GameIdPayload(userSession.getGameSessionId(), userSession.getUsername())));
        }
    }

    private void handleLobbyUnsubscribe(UserSession userSession){
        if(userSessionService.isConnectedToLobby(userSession)) {
            UUID lobbyId = userSession.getLobbyId();
            String lobbyTopic = TOPIC_LOBBY + lobbyId;
            Map<String, String> topics = userSession.getTopicSubscriptions();
            topics.remove(lobbyTopic);
            if(topics.isEmpty()) {
                userSession.setTopicSubscriptions(null);
            }
            userSessionService.save(userSession);
            simpMessagingTemplate.convertAndSend(
                    lobbyTopic,
                    new LobbyEventResponseDto(
                            LobbyEventType.LOBBY_DISCONNECT,
                            "@SERVER",
                            new LobbyEventPayload(lobbyId, userSession.getUsername())
                    )
            );
        }
    }

    private void handleUserRepliesUnsubscribe(UserSession userSession){
        Map<String, String> topics = userSession.getTopicSubscriptions();
        topics.remove(TOPIC_USER_REPLIES);
        if(topics.isEmpty()) {
            userSession.setTopicSubscriptions(null);
        }
        userSessionService.save(userSession);
    }

    private void handleUserErrorsUnsubscribe(UserSession userSession){
        Map<String, String> topics = userSession.getTopicSubscriptions();
        topics.remove(TOPIC_USER_ERRORS);
        if(topics.isEmpty()) {
            userSession.setTopicSubscriptions(null);
        }
        userSessionService.save(userSession);
    }
}
