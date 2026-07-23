package com.tanks.server.websocket.listeners;

import com.tanks.server.dto.UserDto;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.game.GameEventPayload;
import com.tanks.server.websocket.dto.lobby.LobbyEventResponseDto;
import com.tanks.server.websocket.dto.lobby.LobbyEventType;
import com.tanks.server.websocket.dto.lobby.LobbyEventPayload;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.entities.lobby.Lobby;
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


    public WebSocketEventListeners(GameSessionService gameSessionService, LobbyService lobbyService, UserSessionService userSessionService, SimpMessagingTemplate simpMessagingTemplate){
        this.lobbyService = lobbyService;
        this.gameSessionService = gameSessionService;
        this.userSessionService = userSessionService;
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

        if(accessor.getUser() == null) {
            log.debug("Unauthenticated user disconnected");
            return;
        }

        WebSocketPrincipal principal = (WebSocketPrincipal) ((WebSocketAuthentication)accessor.getUser()).getPrincipal();
        UserDto user = principal.getUserDto();
        UserSession userSession = principal.getUserSession();

        // UserSession is null if the user failed inside authorization interceptor
        if(userSession == null) return;

        if (userSession.getState() == UserSessionState.IN_LOBBY) {
            // notify lobby that the user left
            log.debug("User {} left lobby {}", user.username(),userSession.getLobbyId());
            handleLobbyLeave(userSession);
        } else if (userSession.getState() == UserSessionState.IN_GAME) {
            // handle game leave
            log.debug("User {} left game {}", user.username(),userSession.getGameSessionId());
            handleGameLeave(userSession);
        } else {
            userSessionService.delete(userSession);
            log.debug("User {} disconnected", user.username());
        }

    }

    @EventListener
    public void handleSubscribe(SessionSubscribeEvent event){
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        if(accessor.getDestination() == null) return;

        WebSocketAuthentication authentication =  (WebSocketAuthentication)accessor.getUser();
        WebSocketPrincipal webSocketPrincipal = (WebSocketPrincipal) (authentication.getPrincipal());
        UserDto userDto = webSocketPrincipal.getUserDto();

        if(accessor.getDestination().startsWith(TOPIC_LOBBY)){
            var lobbyId = UUID.fromString(accessor.getDestination().substring(TOPIC_LOBBY.length()));
            log.debug("User {} subscribed to lobby {}", userDto.username(), lobbyId);

            Lobby lobby = lobbyService.findById(lobbyId);

            simpMessagingTemplate.convertAndSend(
                    accessor.getDestination(),
                    new LobbyEventResponseDto(
                            LobbyEventType.LOBBY_CONNECT,
                            new LobbyEventPayload(
                                    lobbyId,
                                    lobby.getHost().getId(),
                                    authentication.getName()
                            )
                    )
            );
        } else if (accessor.getDestination().startsWith(TOPIC_GAME)) {
            var gameId = UUID.fromString(accessor.getDestination().substring(TOPIC_GAME.length()));
            log.debug("User {} subscribed to game {}", userDto.username(), gameId);

            UserSession userSession = ((WebSocketPrincipal)authentication.getPrincipal()).getUserSession();
            GameSession gameSession = gameSessionService.getAndIncrementPlayerCount(userSession.getGameSessionId());

            simpMessagingTemplate.convertAndSend(
                    accessor.getDestination(),
                    new GameEventResponseDto(
                            GameEventType.GAME_CONNECT,
                            new GameEventPayload(
                                   gameId,
                                    gameSession.getHostId(),
                                    authentication.getName()
                            )
                    )
            );

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
        UserSession userSession = principal.getUserSession();

        if(userSession == null) return;

        synchronized (userSession) {
            String subscriptionId = accessor.getSubscriptionId();

            Map<String, String> topics = userSession.getTopicSubscriptions();
            if(topics == null || topics.isEmpty()) return;

            var topicEntry =  topics.entrySet().stream()
                    .filter(entry -> entry.getValue().equals(subscriptionId))
                    .findFirst().orElse(null);

            if(topicEntry == null) return;

            String topic = topicEntry.getKey();

            if(topic.startsWith(TOPIC_LOBBY)){
                log.debug("User {} unsubscribed from lobby {}", userSession.getUsername(), userSession.getLobbyId());
                handleLobbyUnsubscribe(userSession);
            } else if (topic.startsWith(TOPIC_GAME)) {
                log.debug("User {} unsubscribed from game {}", userSession.getUsername(), userSession.getLobbyId());
                handleGameUnsubscribe(userSession);
            }else if (topic.startsWith(TOPIC_USER_ERRORS)) {
                log.debug("USER ERRORS UNSUBSCRIBE");
                handleUserErrorsUnsubscribe(userSession);
            }else if (topic.startsWith(TOPIC_USER_REPLIES)) {
                log.debug("USER REPLIES UNSUBSCRIBE");
                handleUserRepliesUnsubscribe(userSession);
            }
        }
    }

    private void removeUserSession(UserSession userSession){
        userSession.setState(null);
        userSession.setLobbyId(null);
        userSession.setSocketSessionId(null);
        userSession.setTopicSubscriptions(null);
    }

    private void handleLobbyLeave(UserSession userSession){
        synchronized (userSession) {
            if (userSession.getState() == UserSessionState.IN_LOBBY) {
                lobbyService.removeUser(userSession);
                removeUserSession(userSession);
            }
        }
    }

    private void handleGameLeave(UserSession userSession){
        synchronized (userSession) {
            if (userSession.getState() == UserSessionState.IN_GAME) {
                String gameTopic = "/topic/game/" + userSession.getGameSessionId();
                userSession.setTopicSubscriptions(null);
                userSession.setSocketSessionId(null);
                userSessionService.save(userSession);
                gameSessionService.decremenentPlayerCount(userSession.getGameSessionId());
                simpMessagingTemplate.convertAndSend(gameTopic, new GameEventResponseDto(GameEventType.GAME_LEAVE, new GameEventPayload(userSession.getGameSessionId(), null, userSession.getUsername())));
            }
        }
    }

    private void handleLobbyUnsubscribe(UserSession userSession){
        if (userSession.getState() == UserSessionState.IN_LOBBY) {
            UUID lobbyId = userSession.getLobbyId();
            String lobbyTopic = TOPIC_LOBBY + lobbyId;
            unsubscribeFromTopic(userSession, lobbyTopic);
            userSessionService.save(userSession);
        }
    }

    private void handleGameUnsubscribe(UserSession userSession){
        if (userSession.getState() == UserSessionState.IN_GAME) {
            UUID gameSessionId = userSession.getGameSessionId();
            String gameTopic = TOPIC_GAME + gameSessionId;
            unsubscribeFromTopic(userSession, gameTopic);
            userSessionService.save(userSession);
            gameSessionService.decremenentPlayerCount(gameSessionId);
            simpMessagingTemplate.convertAndSend(
                    gameTopic,
                    new GameEventResponseDto(
                            GameEventType.GAME_DISCONNECT,
                            new GameEventPayload(gameSessionId, null,userSession.getUsername())
                    )
            );
        }
    }

    private void handleUserRepliesUnsubscribe(UserSession userSession){
        unsubscribeFromTopic(userSession, TOPIC_USER_REPLIES);
        userSessionService.save(userSession);
    }

    private void handleUserErrorsUnsubscribe(UserSession userSession){
        unsubscribeFromTopic(userSession, TOPIC_USER_ERRORS);
        userSessionService.save(userSession);
    }

    private void unsubscribeFromTopic(UserSession userSession, String topic){
        Map<String, String> topics = userSession.getTopicSubscriptions();
        topics.remove(topic);
        if(topics.isEmpty()) {
            userSession.setTopicSubscriptions(null);
        }
    }
}
