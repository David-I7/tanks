package com.tanks.server.websocket.config;

import com.tanks.server.dto.UserDto;
import com.tanks.server.security.model.JwtAuthentication;
import com.tanks.server.websocket.dto.chat.ChatMessageRequestDto;
import com.tanks.server.websocket.dto.chat.ChatMessageResponseDto;
import com.tanks.server.websocket.dto.chat.ChatMessageType;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@AllArgsConstructor
@Slf4j
public class WebSocketEventListeners {

    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {

        log.info("DISCONNECT");
        StompHeaderAccessor accessor =
                StompHeaderAccessor.wrap(event.getMessage());

        String sessionId = accessor.getSessionId();
        if(accessor.getUser() != null) {
            UserDto user = (UserDto) ((JwtAuthentication) accessor.getUser()).getPrincipal();

            ChatMessageResponseDto message = ChatMessageResponseDto.builder()
                    .message(user.username() + " left the chat")
                    .type(ChatMessageType.DISCONNECT)
                    .sender(user.username())
                    .build();

            messagingTemplate.convertAndSend(
                    "/topic/chat",
                    message
            );

            log.info("User '{}' disconnected with session id: {}", user.username(), sessionId);
        }
    }

    @EventListener
    public void handleConnect(SessionConnectEvent event) {

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        String sessionId = accessor.getSessionId();
        UserDto user = (UserDto)((JwtAuthentication) accessor.getUser()).getPrincipal();

        log.debug("User '{}' connected with session id: {}", user.username(),sessionId);
    }
}
