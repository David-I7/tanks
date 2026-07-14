package com.tanks.server.websocket.security.interceptors;

import com.tanks.server.dto.UserDto;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.ClaimService;
import com.tanks.server.websocket.services.UserSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class UserSessionReloadInterceptor implements ChannelInterceptor {

    private final ClaimService claimService;

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

        WebSocketAuthentication authentication = (WebSocketAuthentication) accessor.getUser();
        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        UserDto userDto = principal.getUserDto();

        if (claimService.consumeUserSessionReloadRequired(userDto.id())) {
            log.debug("User session reload required for user {}", userDto.username());
            UserSession userSession = userSessionService.findById(userDto.id());
            principal.setUserSession(userSession);
        }

        return message;
    }
}
