package com.tanks.server.websocket.security.interceptors;

import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.RedisClaimService;
import com.tanks.server.websocket.services.UserSessionService;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserSessionReloadInterceptor implements ChannelInterceptor {

    private final RedisClaimService redisClaimService;

    private final UserSessionService userSessionService;

    @Override
    public @Nullable Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        // Skip if not a STOMP message or if the user is not authenticated
        if (accessor == null
                || accessor.getUser() == null
                || StompCommand.CONNECT.equals(accessor.getCommand())
               ) {
            return message;
        }

        // Only reload user session if it is a subscribe, unsubscribe or disconnect command
        if(!StompCommand.SUBSCRIBE.equals(accessor.getCommand()) &&
                !StompCommand.UNSUBSCRIBE.equals(accessor.getCommand()) &&
                !StompCommand.DISCONNECT.equals(accessor.getCommand())
        ) {
            return message;
        }

        WebSocketAuthentication authentication = (WebSocketAuthentication) accessor.getUser();
        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        Long userId = principal.getUserDto().id();

        if (redisClaimService.consumeUserSessionReloadRequired(userId)) {
            UserSession userSession = userSessionService.findById(userId);
            principal.setUserSession(userSession);
        }

        return message;
    }
}
