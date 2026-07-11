package com.tanks.server.websocket.controllers;

import com.tanks.server.dto.UserDto;
import com.tanks.server.services.AuthService;
import com.tanks.server.utils.ProblemDetailWriter;
import com.tanks.server.websocket.config.WebSocketConfig;
import com.tanks.server.websocket.config.WebSocketSecurityConfig;
import com.tanks.server.websocket.dto.chat.ChatEventType;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.listeners.WebSocketEventListeners;
import com.tanks.server.websocket.security.interceptors.AuthorizationInterceptor;
import com.tanks.server.websocket.security.interceptors.JwtAuthenticationInterceptor;
import com.tanks.server.websocket.security.interceptors.UserSessionReloadInterceptor;
import com.tanks.server.websocket.security.services.GameAuthorizationService;
import com.tanks.server.websocket.security.services.LobbyAuthorizationService;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.LobbyService;
import com.tanks.server.websocket.services.QuickMatchService;
import com.tanks.server.websocket.services.RedisClaimService;
import com.tanks.server.websocket.services.UserSessionService;
import com.tanks.server.websocket.exceptions.StompErrorHandler;
import com.tanks.server.websocket.exceptions.WebSocketExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.util.MimeTypeUtils;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.nio.charset.StandardCharsets;
import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.dto.chat.ChatEventRequestDto;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = WebSocketControllerTest.TestApp.class)
public class WebSocketControllerTest {

    @LocalServerPort
    private int port;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private UserSessionService userSessionService;

    @MockitoBean
    private LobbyService lobbyService;

    @MockitoBean
    private GameSessionService gameSessionService;

    @MockitoBean
    private QuickMatchService quickMatchService;

    @MockitoBean
    private RedisClaimService redisClaimService;

    @Autowired
    private ChatController chatController;

    @EnableAutoConfiguration(exclude = {
            org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration.class,
            org.springframework.boot.jdbc.autoconfigure.DataSourceInitializationAutoConfiguration.class,
            org.springframework.boot.jdbc.autoconfigure.DataSourceTransactionManagerAutoConfiguration.class,
            org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration.class,
            org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration.class
    })
    @EnableMethodSecurity
    @Import({
            WebSocketConfig.class,
            WebSocketSecurityConfig.class,
            JwtAuthenticationInterceptor.class,
            UserSessionReloadInterceptor.class,
            AuthorizationInterceptor.class,
            WebSocketEventListeners.class,
            LobbyController.class,
            ChatController.class,
            GameSessionController.class,
            LobbyAuthorizationService.class,
            GameAuthorizationService.class,
            ProblemDetailWriter.class,
            StompErrorHandler.class,
            WebSocketExceptionHandler.class
    })
    public static class TestApp {
        @org.springframework.context.annotation.Bean
        public org.springframework.security.web.SecurityFilterChain testSecurityFilterChain(org.springframework.security.config.annotation.web.builders.HttpSecurity http) throws Exception {
            return http
                    .csrf(csrf -> csrf.ignoringRequestMatchers("/**"))
                    .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                    .build();
        }
    }

    @Test
    public void sendMessageThrowsExceptionWhenUserSessionIsNull() {
        Authentication auth = mock(Authentication.class);
        WebSocketPrincipal principal = mock(WebSocketPrincipal.class);
        when(auth.getPrincipal()).thenReturn(principal);
        when(principal.getUserSession()).thenReturn(null);

        ChatEventRequestDto requestDto = ChatEventRequestDto.builder()
                .type(ChatEventType.CHAT_MESSAGE)
                .message("hello")
                .build();

        assertThrows(ProblemDetailException.class, () -> {
            chatController.sendMessage("lobby-id", requestDto, auth);
        });
    }

    @Test
    public void lobbyChatMessageRequiresAuthorizedLobbyTopicPresence() throws Exception {
        UUID lobbyId = UUID.randomUUID();
        UserSession lobbySession = createLobbySession(lobbyId);
        StompSession session = connectAs(lobbySession);
        CompletableFuture<String> chatFrame = new CompletableFuture<>();

        session.subscribe("/topic/lobby/" + lobbyId, matchingByteArrayHandler(chatFrame, "CHAT_MESSAGE"));
        TimeUnit.MILLISECONDS.sleep(100);
        sendChatMessage(session, lobbyId, "ready");

        String payload = chatFrame.get(5, TimeUnit.SECONDS);
        assertTrue(payload.contains("\"type\":\"" + ChatEventType.CHAT_MESSAGE + "\""), payload);
        assertTrue(payload.contains("\"sender\":\"player1\""), payload);
        assertTrue(payload.contains("\"message\":\"ready\""), payload);
        session.disconnect();
    }

    @Test
    public void lobbyChatMessageWithoutLobbyTopicPresenceIsRejected() throws Exception {
        UUID lobbyId = UUID.randomUUID();
        UserSession lobbySession = createLobbySession(lobbyId);
        StompSession session = connectAs(lobbySession);
        CompletableFuture<String> errorFrame = new CompletableFuture<>();

        session.subscribe("/user/queue/errors", byteArrayHandler(errorFrame));
        TimeUnit.MILLISECONDS.sleep(100);
        sendChatMessage(session, lobbyId, "ready");

        String payload = errorFrame.get(5, TimeUnit.SECONDS);
        assertTrue(payload.contains("User is not connected to a lobby"), payload);
        session.disconnect();
    }

    @Test
    public void testSubscribeToGameTopicRefreshesSessionFromRedis() throws Exception {
        UUID lobbyId = UUID.randomUUID();
        UUID gameId = UUID.randomUUID();

        // 1. Mock Authentication
        UserDto userDto = new UserDto(1L, "player1", "player1@test.com");
        when(authService.parseUser("valid-token")).thenReturn(userDto);
        when(redisClaimService.claimSocket(any(Long.class), anyString())).thenReturn(true);
        when(redisClaimService.consumeUserSessionReloadRequired(1L)).thenReturn(true);

        // 2. Mock UserSession behavior
        // Initially, user is in LOBBY in the database (Redis)
        UserSession lobbySession = UserSession.builder()
                .id(1L)
                .username("player1")
                .state(UserSessionState.IN_LOBBY)
                .lobbyId(lobbyId)
                .socketSessionId("dummy-session-id")
                .topicSubscriptions(new HashMap<>())
                .build();

        // After game is created, the user session state transitions to IN_GAME
        UserSession gameSession = UserSession.builder()
                .id(1L)
                .username("player1")
                .state(UserSessionState.IN_GAME)
                .gameSessionId(gameId)
                .socketSessionId("dummy-session-id")
                .topicSubscriptions(new HashMap<>())
                .build();

        // Mock findById to throw NOT_FOUND first (for CONNECT, simulating first-time connection),
        // and then return the gameSession (for SUBSCRIBE, simulating the transition on Redis).
        when(userSessionService.findById(1L))
                .thenThrow(new com.tanks.server.websocket.exceptions.ProblemDetailException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "The user session with the provided id does not exist.",
                        java.net.URI.create("about:blank")
                ))
                .thenReturn(gameSession);

        when(userSessionService.save(any(UserSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userSessionService.isInGame(any(UserSession.class), anyString())).thenCallRealMethod();
        when(userSessionService.isInLobby(any(UserSession.class), anyString())).thenCallRealMethod();
        when(userSessionService.isIdle(any(UserSession.class))).thenCallRealMethod();
        when(userSessionService.isConnectedToLobby(any(UserSession.class))).thenCallRealMethod();
        when(userSessionService.isConnectedToGame(any(UserSession.class))).thenCallRealMethod();
        when(gameSessionService.getAndIncrementPlayerCount(gameId))
                .thenReturn(GameSession.builder()
                        .id(gameId)
                        .connectedPlayerCount(1)
                        .state(GameSessionState.CREATED)
                        .build());

        // 3. Connect to WebSocket
        WebSocketStompClient stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer valid-token");

        CompletableFuture<StompSession> sessionFuture = new CompletableFuture<>();
        CompletableFuture<Throwable> errorFuture = new CompletableFuture<>();

        stompClient.connectAsync("ws://localhost:" + port + "/ws", new org.springframework.web.socket.WebSocketHttpHeaders(), connectHeaders, new StompSessionHandlerAdapter() {
            @Override
            public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
                sessionFuture.complete(session);
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                if (headers.containsKey("message")) {
                    errorFuture.complete(new RuntimeException(headers.getFirst("message")));
                    sessionFuture.completeExceptionally(new RuntimeException(headers.getFirst("message")));
                }
            }

            @Override
            public void handleException(StompSession session, StompCommand command, StompHeaders headers, byte[] payload, Throwable exception) {
                errorFuture.complete(exception);
                sessionFuture.completeExceptionally(exception);
            }

            @Override
            public void handleTransportError(StompSession session, Throwable exception) {
                errorFuture.complete(exception);
                sessionFuture.completeExceptionally(exception);
            }
        });

        StompSession session = sessionFuture.get(5, TimeUnit.SECONDS);
        assertNotNull(session);
        assertTrue(session.isConnected());

        // 4. Try subscribing to the game topic
        CompletableFuture<Boolean> subscribeFuture = new CompletableFuture<>();
        session.subscribe("/topic/game/" + gameId, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
            }
        });

        try {
            Throwable err = errorFuture.get(1, TimeUnit.SECONDS);
            fail("Subscription failed with error: " + err.getMessage());
        } catch (java.util.concurrent.TimeoutException e) {
            // Success: no errors received, indicating subscription was authorized and succeeded!
            subscribeFuture.complete(true);
        }

        assertTrue(subscribeFuture.get());
        session.disconnect();
    }

    private StompSession connectAs(UserSession userSession) throws Exception {
        UserDto userDto = new UserDto(userSession.getId(), userSession.getUsername(), userSession.getUsername() + "@test.com");
        when(authService.parseUser("valid-token")).thenReturn(userDto);
        when(redisClaimService.claimSocket(any(Long.class), anyString())).thenReturn(true);
        when(redisClaimService.consumeUserSessionReloadRequired(userSession.getId())).thenReturn(false);
        when(userSessionService.findById(userSession.getId())).thenReturn(userSession);
        when(userSessionService.save(any(UserSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userSessionService.isInLobby(any(UserSession.class), anyString())).thenCallRealMethod();
        when(userSessionService.isConnectedToLobby(any(UserSession.class))).thenCallRealMethod();

        WebSocketStompClient stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer valid-token");

        CompletableFuture<StompSession> sessionFuture = new CompletableFuture<>();
        stompClient.connectAsync("ws://localhost:" + port + "/ws", new org.springframework.web.socket.WebSocketHttpHeaders(), connectHeaders, new StompSessionHandlerAdapter() {
            @Override
            public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
                sessionFuture.complete(session);
            }

            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                String errorPayload = payload instanceof byte[] bytes
                        ? new String(bytes, StandardCharsets.UTF_8)
                        : String.valueOf(payload);
                sessionFuture.completeExceptionally(new RuntimeException(errorPayload));
            }

            @Override
            public void handleException(StompSession session, StompCommand command, StompHeaders headers, byte[] payload, Throwable exception) {
                sessionFuture.completeExceptionally(exception);
            }

            @Override
            public void handleTransportError(StompSession session, Throwable exception) {
                sessionFuture.completeExceptionally(exception);
            }
        });

        StompSession session = sessionFuture.get(5, TimeUnit.SECONDS);
        assertNotNull(session);
        assertTrue(session.isConnected());
        return session;
    }

    private static void sendChatMessage(StompSession session, UUID lobbyId, String message) {
        StompHeaders sendHeaders = new StompHeaders();
        sendHeaders.setDestination("/app/chat/" + lobbyId + "/send");
        sendHeaders.setContentType(MimeTypeUtils.APPLICATION_JSON);
        String payload = "{\"type\":\"CHAT_MESSAGE\",\"message\":\"" + message + "\"}";
        session.send(sendHeaders, payload.getBytes(StandardCharsets.UTF_8));
    }

    private static StompFrameHandler byteArrayHandler(CompletableFuture<String> frameFuture) {
        return matchingByteArrayHandler(frameFuture, null);
    }

    private static StompFrameHandler matchingByteArrayHandler(CompletableFuture<String> frameFuture, String requiredText) {
        return new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                String text = new String((byte[]) payload, StandardCharsets.UTF_8);
                if (requiredText == null || text.contains(requiredText)) {
                    frameFuture.complete(text);
                }
            }
        };
    }

    private UserSession createLobbySession(UUID lobbyId) {
        return UserSession.builder()
                .id(1L)
                .username("player1")
                .state(UserSessionState.IN_LOBBY)
                .lobbyId(lobbyId)
                .topicSubscriptions(new HashMap<>())
                .build();
    }
}
