package com.tanks.server.websocket.security.interceptors;


import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.security.services.WebSocketAuthorizationService;
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

import java.util.HashSet;
import java.util.Set;


@Component
@RequiredArgsConstructor
public class AuthorizationInterceptor implements ChannelInterceptor {

    private static final String TOPIC_LOBBY = "/topic/lobby/";

    private static final String TOPIC_GAME = "/topic/game/";

    private final UserSessionService userSessionService;

    private final WebSocketAuthorizationService webSocketAuthorizationService;

    @Override
    public @Nullable Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        WebSocketAuthentication authentication = (WebSocketAuthentication) accessor.getUser();

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {

            WebSocketPrincipal principal = (WebSocketPrincipal) ((WebSocketAuthentication) accessor.getUser()).getPrincipal();
            String sessionId = accessor.getSessionId();

            try {
                UserSession userSession = userSessionService.findById(principal.getUserDto().id());

                if(sessionId != null && !sessionId.equals(userSession.getSocketSessionId())){
                    throw new ProblemDetailException(HttpStatus.BAD_REQUEST,"User is already connected", null);
                }

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

        WebSocketPrincipal principal = (WebSocketPrincipal)authentication.getPrincipal();
        UserSession userSession = principal.getUserSession();

        if( StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            if(userSession == null) throw new ProblemDetailException(HttpStatus.BAD_REQUEST,"Illegal state. User must connect first.", null);

            Set<String> topicSubscriptions = userSession.getTopicSubscriptions();

            if(topicSubscriptions != null && topicSubscriptions.contains(accessor.getDestination())){
                throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "User is already subscribed to this topic", null);
            }

            if (accessor.getDestination().startsWith(TOPIC_LOBBY)) {
                webSocketAuthorizationService.canJoinLobbyTopic(authentication, accessor.getDestination());
            } else if (accessor.getDestination().startsWith(TOPIC_GAME)) {
                webSocketAuthorizationService.canJoinGameTopic(authentication, accessor.getDestination());
            }

            if(topicSubscriptions == null){
                topicSubscriptions = new HashSet<>();
            }

            topicSubscriptions.add(accessor.getDestination());
            userSession.setTopicSubscriptions(topicSubscriptions);
            userSessionService.save(userSession);
        }

        return message;
    }
}
