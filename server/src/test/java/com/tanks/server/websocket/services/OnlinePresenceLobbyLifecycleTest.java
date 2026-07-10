package com.tanks.server.websocket.services;

import com.tanks.server.dto.UserDto;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.repositories.LobbyRepository;
import com.tanks.server.websocket.repositories.UserSessionRepository;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.security.interceptors.AuthorizationInterceptor;
import com.tanks.server.websocket.security.services.GameAuthorizationService;
import com.tanks.server.websocket.security.services.LobbyAuthorizationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.TestingAuthenticationToken;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OnlinePresenceLobbyLifecycleTest {

    @Test
    @DisplayName("One authenticated user can claim only one Active Socket")
    void oneAuthenticatedUserCanClaimOnlyOneActiveSocket() {
        UserSessionService userSessionService = mock(UserSessionService.class);
        RedisClaimService redisClaimService = mock(RedisClaimService.class);
        AuthorizationInterceptor interceptor = new AuthorizationInterceptor(
                userSessionService,
                mock(LobbyAuthorizationService.class),
                mock(GameAuthorizationService.class),
                redisClaimService);
        when(redisClaimService.claimSocket(1L, "socket-b")).thenReturn(false);

        assertThatThrownBy(() -> interceptor.preSend(connectMessage(1L, "player", "socket-b"), mock(org.springframework.messaging.MessageChannel.class)))
                .isInstanceOf(ProblemDetailException.class)
                .hasMessageContaining("User is already connected");

        verify(userSessionService, never()).save(any(UserSession.class));
    }

    @Test
    @DisplayName("Active Socket claim is refreshed on authenticated socket traffic")
    void activeSocketClaimIsRefreshedOnAuthenticatedSocketTraffic() {
        UserSessionService userSessionService = mock(UserSessionService.class);
        RedisClaimService redisClaimService = mock(RedisClaimService.class);
        AuthorizationInterceptor interceptor = new AuthorizationInterceptor(
                userSessionService,
                mock(LobbyAuthorizationService.class),
                mock(GameAuthorizationService.class),
                redisClaimService);

        interceptor.preSend(sendMessage(1L, "player", "socket-a"), mock(org.springframework.messaging.MessageChannel.class));

        verify(redisClaimService).refreshSocketClaim(1L);
    }

    @Test
    @DisplayName("Lobby and Game actions require Topic Presence")
    void actionsRequireTopicPresence() {
        UUID lobbyId = UUID.randomUUID();
        UUID gameId = UUID.randomUUID();
        UserSessionService userSessionService = new UserSessionService(
                mock(com.tanks.server.websocket.repositories.UserSessionRepository.class),
                mock(LobbyRepository.class),
                mock(com.tanks.server.websocket.repositories.GameSessionRepository.class));
        LobbyAuthorizationService lobbyAuthorizationService = new LobbyAuthorizationService(userSessionService);
        GameAuthorizationService gameAuthorizationService = new GameAuthorizationService(mock(LobbyService.class), userSessionService);

        UserSession lobbySession = UserSession.builder()
                .id(1L)
                .username("host")
                .state(UserSessionState.IN_LOBBY)
                .lobbyId(lobbyId)
                .build();
        UserSession gameSession = UserSession.builder()
                .id(1L)
                .username("host")
                .state(UserSessionState.IN_GAME)
                .gameSessionId(gameId)
                .build();

        assertThatThrownBy(() -> lobbyAuthorizationService.canSendMessageToTopic(authentication(lobbySession), "/topic/lobby/" + lobbyId))
                .isInstanceOf(ProblemDetailException.class)
                .hasMessageContaining("User is not connected to a lobby");
        assertThatThrownBy(() -> lobbyAuthorizationService.canLeaveLobby(authentication(lobbySession), "/lobby/leave"))
                .isInstanceOf(ProblemDetailException.class)
                .hasMessageContaining("User is not connected to a lobby");
        assertThatThrownBy(() -> gameAuthorizationService.canSendMessageToTopic(authentication(gameSession), "/topic/game/" + gameId))
                .isInstanceOf(ProblemDetailException.class)
                .hasMessageContaining("User is not connected to a game");
    }

    @Test
    @DisplayName("Lobby survives host disconnect by promoting the remaining player")
    void lobbySurvivesHostDisconnectByPromotingRemainingPlayer() {
        TestHarness harness = new TestHarness();
        UUID lobbyId = UUID.randomUUID();
        UserSession host = UserSession.builder()
                .id(1L)
                .username("host")
                .state(UserSessionState.IN_LOBBY)
                .lobbyId(lobbyId)
                .build();
        Lobby lobby = Lobby.builder()
                .id(lobbyId)
                .type(LobbyType.PRIVATE)
                .status(LobbyStatus.READY)
                .hostId(1L)
                .opponentId(2L)
                .build();
        when(harness.lobbyRepository.findById(lobbyId)).thenReturn(Optional.of(lobby));

        harness.lobbyService.removeUser(host);

        assertThat(lobby.getHostId()).isEqualTo(2L);
        assertThat(lobby.getOpponentId()).isNull();
        assertThat(lobby.getStatus()).isEqualTo(LobbyStatus.WAITING_FOR_OPPONENT);
        verify(harness.lobbyRepository).save(lobby);
    }

    @Test
    @DisplayName("Empty lobbies are deleted immediately")
    void emptyLobbiesAreDeletedImmediately() {
        TestHarness harness = new TestHarness();
        UUID lobbyId = UUID.randomUUID();
        UserSession host = UserSession.builder()
                .id(1L)
                .username("host")
                .state(UserSessionState.IN_LOBBY)
                .lobbyId(lobbyId)
                .build();
        Lobby lobby = Lobby.builder()
                .id(lobbyId)
                .type(LobbyType.QUICK_MATCH)
                .status(LobbyStatus.WAITING_FOR_OPPONENT)
                .hostId(1L)
                .build();
        when(harness.lobbyRepository.findById(lobbyId)).thenReturn(Optional.of(lobby));

        harness.lobbyService.removeUser(host);

        verify(harness.lobbyRepository).delete(lobby);
        verify(harness.quickMatchService).delete(lobby);
        verify(harness.redisClaimService).deleteLobbyJoin(lobbyId);
        verify(harness.redisClaimService).deleteGameCreation(lobbyId);
    }

    @Test
    @DisplayName("Quick Match pairs with the oldest valid waiting quick-match Lobby")
    void quickMatchPairsWithOldestValidWaitingLobby() {
        LobbyRepository lobbyRepository = mock(LobbyRepository.class);
        RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
        ZSetOperations<String, Object> zSetOperations = mock(ZSetOperations.class);
        QuickMatchService quickMatchService = new QuickMatchService(lobbyRepository, redisTemplate);
        UUID fullLobbyId = UUID.randomUUID();
        UUID privateLobbyId = UUID.randomUUID();
        UUID validLobbyId = UUID.randomUUID();
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(zSetOperations.popMin("quick_match"))
                .thenReturn(tuple(fullLobbyId))
                .thenReturn(tuple(privateLobbyId))
                .thenReturn(tuple(validLobbyId))
                .thenReturn(null);
        when(lobbyRepository.findById(fullLobbyId)).thenReturn(Optional.of(Lobby.builder()
                .id(fullLobbyId)
                .type(LobbyType.QUICK_MATCH)
                .status(LobbyStatus.READY)
                .hostId(1L)
                .opponentId(2L)
                .build()));
        when(lobbyRepository.findById(privateLobbyId)).thenReturn(Optional.of(Lobby.builder()
                .id(privateLobbyId)
                .type(LobbyType.PRIVATE)
                .status(LobbyStatus.WAITING_FOR_OPPONENT)
                .hostId(3L)
                .build()));
        Lobby validLobby = Lobby.builder()
                .id(validLobbyId)
                .type(LobbyType.QUICK_MATCH)
                .status(LobbyStatus.WAITING_FOR_OPPONENT)
                .hostId(4L)
                .build();
        when(lobbyRepository.findById(validLobbyId)).thenReturn(Optional.of(validLobby));

        assertThat(quickMatchService.popBestQuickMatch()).containsSame(validLobby);
    }

    @Test
    @DisplayName("Private lobbies use the Lobby ID as the Private Invite")
    void privateLobbiesUseLobbyIdAsPrivateInvite() {
        TestHarness harness = new TestHarness();
        UUID privateInvite = UUID.randomUUID();
        UserSession opponent = UserSession.builder()
                .id(2L)
                .username("opponent")
                .state(UserSessionState.IDLE)
                .build();
        Lobby lobby = Lobby.builder()
                .id(privateInvite)
                .type(LobbyType.PRIVATE)
                .status(LobbyStatus.WAITING_FOR_OPPONENT)
                .hostId(1L)
                .build();
        when(harness.redisClaimService.claimLobbyJoin(privateInvite, 2L)).thenReturn(true);
        when(harness.lobbyRepository.findById(privateInvite)).thenReturn(Optional.of(lobby));
        when(harness.userSessionRepository.save(any(UserSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        harness.lobbyService.join(privateInvite, opponent);

        assertThat(lobby.getOpponentId()).isEqualTo(2L);
        assertThat(lobby.getStatus()).isEqualTo(LobbyStatus.READY);
        assertThat(opponent.getState()).isEqualTo(UserSessionState.IN_LOBBY);
        assertThat(opponent.getLobbyId()).isEqualTo(privateInvite);
    }

    private static Message<?> connectMessage(Long userId, String username, String socketSessionId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId(socketSessionId);
        accessor.setUser(new WebSocketAuthentication(new WebSocketPrincipal(new UserDto(userId, username, username + "@test.com"))));
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static Message<?> sendMessage(Long userId, String username, String socketSessionId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setSessionId(socketSessionId);
        WebSocketPrincipal principal = new WebSocketPrincipal(new UserDto(userId, username, username + "@test.com"));
        principal.setUserSession(UserSession.builder()
                .id(userId)
                .username(username)
                .state(UserSessionState.IDLE)
                .socketSessionId(socketSessionId)
                .build());
        accessor.setUser(new WebSocketAuthentication(principal));
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static TestingAuthenticationToken authentication(UserSession userSession) {
        WebSocketPrincipal principal = new WebSocketPrincipal(new UserDto(userSession.getId(), userSession.getUsername(), userSession.getUsername() + "@test.com"));
        principal.setUserSession(userSession);
        return new TestingAuthenticationToken(principal, null);
    }

    private static ZSetOperations.TypedTuple<Object> tuple(UUID lobbyId) {
        return new ZSetOperations.TypedTuple<>() {
            @Override
            public Object getValue() {
                return lobbyId.toString();
            }

            @Override
            public Double getScore() {
                return 0.0;
            }

            @Override
            public int compareTo(ZSetOperations.TypedTuple<Object> other) {
                return 0;
            }
        };
    }

    private static class TestHarness {
        private final LobbyRepository lobbyRepository = mock(LobbyRepository.class);
        private final UserSessionRepository userSessionRepository = mock(UserSessionRepository.class);
        private final QuickMatchService quickMatchService = mock(QuickMatchService.class);
        private final UserSessionService userSessionService = new UserSessionService(
                userSessionRepository,
                lobbyRepository,
                mock(com.tanks.server.websocket.repositories.GameSessionRepository.class));
        private final RedisClaimService redisClaimService = mock(RedisClaimService.class);
        private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
        private final LobbyService lobbyService = new LobbyService(
                lobbyRepository,
                quickMatchService,
                userSessionService,
                redisClaimService,
                eventPublisher);
    }
}
