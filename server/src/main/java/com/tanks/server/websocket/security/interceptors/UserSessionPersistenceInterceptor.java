package com.tanks.server.websocket.security.interceptors;

import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.UserSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class UserSessionPersistenceInterceptor implements ChannelInterceptor {

    private static final String USER_SESSION_SNAPSHOT_KEY = "USER_SESSION_SNAPSHOT";

    private final UserSessionService userSessionService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        UserSession userSession = getUserSession(accessor);

        if (userSession != null && accessor != null && accessor.getSessionAttributes() != null) {
            accessor.getSessionAttributes().put(
                    USER_SESSION_SNAPSHOT_KEY,
                    new UserSession(userSession)
            );
        }

        return message;
    }

    @Override
    public void postSend(Message<?> message, MessageChannel channel, boolean sent) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        UserSession currentUserSession = getUserSession(accessor);

        if (currentUserSession == null || accessor == null || accessor.getSessionAttributes() == null) {
            return;
        }

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();

        UserSession previousUserSession =
                (UserSession) sessionAttributes.remove(USER_SESSION_SNAPSHOT_KEY);

        if (previousUserSession == null) {
            return;
        }

        if (!Objects.equals(previousUserSession, currentUserSession)) {
            userSessionService.save(currentUserSession);
        }
    }

    private UserSession getUserSession(StompHeaderAccessor accessor) {
        if (accessor == null || accessor.getUser() == null) {
            return null;
        }

        if (!(accessor.getUser() instanceof WebSocketAuthentication authentication)) {
            return null;
        }

        if (!(authentication.getPrincipal() instanceof WebSocketPrincipal principal)) {
            return null;
        }

        return principal.getUserSession();
    }
}