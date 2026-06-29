package com.tanks.server.websocket.security.interceptors;


import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.security.services.GameAuthorizationService;
import com.tanks.server.websocket.security.services.LobbyAuthorizationService;
import com.tanks.server.websocket.services.LobbyReconnectService;
import com.tanks.server.websocket.services.UserSessionService;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;


@Component
@RequiredArgsConstructor
public class AuthorizationInterceptor implements ChannelInterceptor {

    private static final String TOPIC_LOBBY = "/topic/lobby/";

    private static final String TOPIC_GAME = "/topic/game/";

    private final UserSessionService userSessionService;

    private final LobbyAuthorizationService lobbyAuthorizationService;

    private final GameAuthorizationService gameAuthorizationService;

    private final LobbyReconnectService lobbyReconnectService;

    @Override
    public @Nullable Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        WebSocketAuthentication authentication = (WebSocketAuthentication) accessor.getUser();

        if (StompCommand.CONNECT.equals(accessor.getCommand())){

            WebSocketPrincipal principal = (WebSocketPrincipal) ((WebSocketAuthentication) accessor.getUser()).getPrincipal();
            String sessionId = accessor.getSessionId();

            try {
                UserSession userSession = userSessionService.findById(principal.getUserDto().id());

                if(userSession.getSocketSessionId() != null && !sessionId.equals(userSession.getSocketSessionId())){
                    throw new ProblemDetailException(HttpStatus.BAD_REQUEST,"User is already connected", null);
                }

                userSession.setSocketSessionId(sessionId);
                userSessionService.save(userSession);
                principal.setUserSession(userSession);
            }catch (ProblemDetailException ex){
                // user is connecting for the first time
                if(ex.getStatus().equals(HttpStatus.NOT_FOUND)){
                    UserSession userSession = UserSession.builder()
                            .id(principal.getUserDto().id())
                            .username(principal.getUserDto().username())
                            .state(UserSessionState.IDLE)
                            .socketSessionId(sessionId)
                            .build();

                    principal.setUserSession(userSession);
                    userSessionService.save(userSession);
                }else {
                    throw ex;
                }
            }
        }

        if(StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            WebSocketPrincipal principal = (WebSocketPrincipal)authentication.getPrincipal();
            UserSession userSession = userSessionService.findById(principal.getUserDto().id());
            principal.setUserSession(userSession);

            Map<String, String> topicSubscriptions = userSession.getTopicSubscriptions();

            if(topicSubscriptions != null && topicSubscriptions.containsKey(accessor.getDestination())){
                throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "User is already subscribed to this topic", null);
            }

            if (accessor.getDestination().startsWith(TOPIC_LOBBY)) {
                lobbyAuthorizationService.canJoinTopic(authentication, accessor.getDestination());
                lobbyReconnectService.markConnected(userSession);
            } else if (accessor.getDestination().startsWith(TOPIC_GAME)) {
                gameAuthorizationService.canJoinTopic(authentication, accessor.getDestination());
            }

            if(topicSubscriptions == null){
                topicSubscriptions = new HashMap<>();
            }

            topicSubscriptions.put(accessor.getDestination(),accessor.getSubscriptionId());
            userSession.setTopicSubscriptions(topicSubscriptions);
            userSessionService.save(userSession);
        }

        return message;
    }
}
