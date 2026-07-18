package com.tanks.server.websocket.security.interceptors;


import com.tanks.server.dto.UserDto;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.security.services.GameAuthorizationService;
import com.tanks.server.websocket.security.services.LobbyAuthorizationService;
import com.tanks.server.websocket.services.ClaimService;
import com.tanks.server.websocket.services.UserSessionService;
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

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;


@Component
@RequiredArgsConstructor
@Slf4j
public class AuthorizationInterceptor implements ChannelInterceptor {

    private static final String TOPIC_LOBBY = "/topic/lobby/";

    private static final String TOPIC_GAME = "/topic/game/";

    private final UserSessionService userSessionService;

    private final LobbyAuthorizationService lobbyAuthorizationService;

    private final GameAuthorizationService gameAuthorizationService;

    private final ClaimService claimService;

    @Override
    public void afterSendCompletion(
            Message<?> message,
            MessageChannel channel,
            boolean sent,
            Exception ex) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getUser() == null) {
            return;
        }

        WebSocketAuthentication authentication = (WebSocketAuthentication) accessor.getUser();
        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        UserDto userDto = principal.getUserDto();
        String sessionId = accessor.getSessionId();

        if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
            handlePostDisconnect(userDto.id(), sessionId);
            return;
        }

        if (!StompCommand.SUBSCRIBE.equals(accessor.getCommand()) && !StompCommand.SEND.equals(accessor.getCommand())) {
            return;
        }

        ReentrantLock lock = (ReentrantLock) accessor.getHeader("socketLock");
        if (lock != null && lock.isHeldByCurrentThread()) {
            lock.unlock();
        }
    }

    @Override
    public @Nullable Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            handleConnect(accessor);
            return message;
        }

        if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
            return message;
        }

        if (!StompCommand.SUBSCRIBE.equals(accessor.getCommand()) && !StompCommand.SEND.equals(accessor.getCommand())) {
            return message;
        }

        WebSocketAuthentication authentication = (WebSocketAuthentication) accessor.getUser();
        if (authentication == null) return message;

        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        UserSession userSession = principal.getUserSession();
        if (userSession == null) return message;

        ReentrantLock lock = claimService.getSocketLock(userSession.getId());
        if (lock == null) throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "User disconnected");

        lock.lock();
        accessor.setHeader("socketLock", lock);

        // If a disconnect event happened while acquiring the lock, the user is already disconnected, so there is no need to fulfil this request
        ReentrantLock lock2 = claimService.getSocketLock(userSession.getId());
        if (lock2 == null) throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "User disconnected");

        try {
            if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                handlePreSubscribe(authentication, accessor);
            } else if (StompCommand.SEND.equals(accessor.getCommand())) {
                handlePreSend(authentication, accessor);
            }
        } catch (Exception e) {
            throw e;
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor){
        WebSocketPrincipal principal = (WebSocketPrincipal) ((WebSocketAuthentication) accessor.getUser()).getPrincipal();
        String sessionId = accessor.getSessionId();
        Long userId = principal.getUserDto().id();

        try {
            if (!claimService.claimSocket(userId, sessionId)) {
                log.debug("User {} is already connected", principal.getUserDto().username());
                throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "User is already connected");
            }

            UserSession userSession = userSessionService.findById(userId);
            userSession.setSocketSessionId(sessionId);
            userSessionService.save(userSession);
            principal.setUserSession(userSession);
        } catch (ProblemDetailException ex) {
            // user is connecting for the first time
            if (ex.getStatus().equals(HttpStatus.NOT_FOUND)) {
                UserSession userSession = UserSession.builder()
                        .id(principal.getUserDto().id())
                        .username(principal.getUserDto().username())
                        .state(UserSessionState.IDLE)
                        .socketSessionId(sessionId)
                        .build();

                principal.setUserSession(userSession);
                userSessionService.save(userSession);
            }
        } catch (Exception e) {
            claimService.releaseSocket(userId, sessionId);
            throw e;
        }
    }

    private void handlePreSubscribe(WebSocketAuthentication authentication, StompHeaderAccessor accessor){
        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        UserSession userSession = principal.getUserSession();
        Map<String, String> topicSubscriptions = userSession.getTopicSubscriptions();
        String destination = accessor.getDestination();

        if(topicSubscriptions != null && topicSubscriptions.containsKey(destination)){
            log.debug("User {} is already subscribed to this topic", principal.getUserDto().username());
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "User is already subscribed to this topic");
        }

        if (destination.startsWith(TOPIC_LOBBY)) {
            lobbyAuthorizationService.canJoinTopic(authentication, destination);
        } else if (destination.startsWith(TOPIC_GAME)) {
            gameAuthorizationService.canJoinTopic(authentication, destination);
        }

        if(topicSubscriptions == null){
            topicSubscriptions = new HashMap<>();
        }

        topicSubscriptions.put(destination,accessor.getSubscriptionId());
        userSession.setTopicSubscriptions(topicSubscriptions);
        userSessionService.save(userSession);
    }

    private void handlePreSend(WebSocketAuthentication authentication,StompHeaderAccessor accessor){
        String destination = accessor.getDestination();
        log.debug("User {} is sending a request to {}", authentication.getName(),destination);
    }

    private void handlePostDisconnect(Long userId,String sessionId){
        claimService.releaseSocket(userId, sessionId);
    }
}
