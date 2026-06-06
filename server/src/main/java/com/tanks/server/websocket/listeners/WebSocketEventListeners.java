package com.tanks.server.websocket.listeners;

import com.tanks.server.dto.UserDto;
import com.tanks.server.mappers.user.UserDtoToUserMapper;
import com.tanks.server.security.model.JwtAuthentication;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.LobbyService;
import com.tanks.server.websocket.dto.chat.ChatEventResponseDto;
import com.tanks.server.websocket.dto.chat.ChatEventType;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.net.URI;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Slf4j
public class WebSocketEventListeners {

    private final SimpMessagingTemplate messagingTemplate;

    private Pattern LOBBY_ID_PATTERN = Pattern.compile(
            "/topic/lobby/([0-9A-Za-z]{8}-[0-9A-Za-z]{4}-4[0-9A-Za-z]{3}-[89ABab][0-9A-Za-z]{3}-[0-9A-Za-z]{12})/.*"
    );

    private UserDtoToUserMapper userDtoToUserMapper;

    private LobbyService lobbyService;

    private GameSessionService gameService;

    public WebSocketEventListeners(SimpMessagingTemplate messagingTemplate, LobbyService lobbyService){
        this.messagingTemplate = messagingTemplate;
        this.lobbyService = lobbyService;
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {

        log.info("DISCONNECT");
        StompHeaderAccessor accessor =
                StompHeaderAccessor.wrap(event.getMessage());

        Map<String, Object> attrs =
                accessor.getSessionAttributes();

        if(attrs == null || accessor.getUser() == null) return;

        UUID lobbyId = (UUID) attrs.get("lobbyId");
        String sessionId = accessor.getSessionId();

        if (lobbyId == null) return;

        UserDto user = (UserDto) ((JwtAuthentication) accessor.getUser()).getPrincipal();

        ChatEventResponseDto message = ChatEventResponseDto.builder()
                .type(ChatEventType.DISCONNECT)
                .sender(user.username())
                .build();

        messagingTemplate.convertAndSend(
                String.format("/topic/lobby/%s/chat",lobbyId),
                message
        );

        log.info("User '{}' disconnected with session id: {}", user.username(), sessionId);

        lobbyService.removeUser(lobbyId,userDtoToUserMapper.apply(user));
    }

    @EventListener
    public void handleConnect(SessionConnectEvent event) {

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        String sessionId = accessor.getSessionId();
        UserDto user = (UserDto)((JwtAuthentication) accessor.getUser()).getPrincipal();

        log.debug("User '{}' connected with session id: {}", user.username(),sessionId);
    }

    @EventListener
    public void handleSubscribe(SessionSubscribeEvent event){
        SimpMessageHeaderAccessor accessor =
                SimpMessageHeaderAccessor.wrap(event.getMessage());

        String destination = accessor.getDestination();

        if (destination == null ||
                !destination.startsWith("/topic/lobby/")) {
            return;
        }

        Matcher matcher = LOBBY_ID_PATTERN.matcher(destination);

        if(!matcher.matches()) throw new ProblemDetailException(HttpStatus.BAD_REQUEST,"Missing or invalid lobby id", URI.create(destination));

        UUID lobbyId = UUID.fromString(matcher.group(0));

        Map<String, Object> attrs =
                accessor.getSessionAttributes();

        attrs.put("lobbyId", lobbyId);
    }
}
