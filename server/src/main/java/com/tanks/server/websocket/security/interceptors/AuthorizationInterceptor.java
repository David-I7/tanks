package com.tanks.server.websocket.security.interceptors;

import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.security.entities.WebSocketAuthentication;
import com.tanks.server.websocket.security.entities.WebSocketPrincipal;
import com.tanks.server.websocket.security.services.GameAuthorizationService;
import com.tanks.server.websocket.security.services.LobbyAuthorizationService;
import com.tanks.server.websocket.services.ClaimService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuthorizationInterceptor implements ChannelInterceptor {

    private static final String TOPIC_LOBBY = "/topic/lobby/";
    private static final String TOPIC_GAME = "/topic/game/";

    private final LobbyAuthorizationService lobbyAuthorizationService;
    private final GameAuthorizationService gameAuthorizationService;
    private final ClaimService claimService;

    @Override
    public void afterSendCompletion(
            Message<?> message,
            MessageChannel channel,
            boolean sent,
            Exception ex) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getUser() == null) {
            return;
        }

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes != null) {
            ReentrantLock lock = (ReentrantLock) sessionAttributes.remove("socketLock");
            if (lock != null && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    @Override
    public @Nullable Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            handleConnect(accessor);
            return message;
        }

        if (!StompCommand.SUBSCRIBE.equals(accessor.getCommand())
                && !StompCommand.UNSUBSCRIBE.equals(accessor.getCommand())
                && !StompCommand.SEND.equals(accessor.getCommand())
                && !StompCommand.DISCONNECT.equals(accessor.getCommand())) {
            return message;
        }

        WebSocketAuthentication authentication = (WebSocketAuthentication) accessor.getUser();
        if (authentication == null) {
            return message;
        }

        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        UUID playerId = principal.getPlayerId();

        ReentrantLock lock = claimService.getSocketLock(playerId);
        if (lock == null) {
            if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
                log.debug("Ignoring DISCONNECT for already disconnected player {}", principal.getNickname());
                return message;
            }
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Player disconnected");
        }

        lock.lock();
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes != null) {
            sessionAttributes.put("socketLock", lock);
        }

        ReentrantLock activeSocketLock = claimService.getSocketLock(playerId);
        if (activeSocketLock == null) {
            lock.unlock();
            if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
                return message;
            }
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Player disconnected");
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            handlePreSubscribe(authentication, accessor);
        } else if (StompCommand.SEND.equals(accessor.getCommand())) {
            handlePreSend(authentication, accessor);
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof WebSocketAuthentication authentication)) {
            throw new ProblemDetailException(HttpStatus.UNAUTHORIZED, "Unauthenticated connection");
        }

        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        String sessionId = accessor.getSessionId();
        UUID playerId = principal.getPlayerId();

        if (!claimService.claimSocket(playerId, sessionId)) {
            log.debug("Player {} is already connected", principal.getNickname());
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Player is already connected");
        }
    }

    private void handlePreSubscribe(WebSocketAuthentication authentication, StompHeaderAccessor accessor) {
        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        Map<String, String> topicSubscriptions = principal.getTopicSubscriptions();
        String destination = accessor.getDestination();

        if (destination == null) {
            return;
        }

        if (topicSubscriptions.containsKey(destination)) {
            log.debug("Player {} is already subscribed to this topic", principal.getNickname());
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Player is already subscribed to this topic");
        }

        if (destination.startsWith(TOPIC_LOBBY)) {
            lobbyAuthorizationService.canJoinTopic(authentication, destination);
        } else if (destination.startsWith(TOPIC_GAME)) {
            gameAuthorizationService.canJoinTopic(authentication, destination);
        }

        topicSubscriptions.put(destination, accessor.getSubscriptionId());
    }

    private void handlePreSend(WebSocketAuthentication authentication, StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        log.debug("Player {} is sending a request to {}", authentication.getName(), destination);
    }
}
