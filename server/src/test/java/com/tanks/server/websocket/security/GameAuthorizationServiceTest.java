package com.tanks.server.websocket.security;

import com.tanks.server.dto.UserDto;
import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestDto;
import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestType;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.MoveIntentRequestPayload;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.security.services.GameAuthorizationService;
import com.tanks.server.websocket.services.LobbyService;
import com.tanks.server.websocket.services.UserSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class GameAuthorizationServiceTest {

    private LobbyService lobbyService;
    private UserSessionService userSessionService;
    private GameSessionRepository gameSessionRepository;
    private GameAuthorizationService gameAuthorizationService;

    @BeforeEach
    public void setup() {
        lobbyService = mock(LobbyService.class);
        userSessionService = mock(UserSessionService.class);
        gameSessionRepository = mock(GameSessionRepository.class);
        gameAuthorizationService = new GameAuthorizationService(lobbyService, userSessionService, gameSessionRepository);
    }

    private Authentication createMockAuth(Long userId, String username) {
        UserSession userSession = UserSession.builder().id(userId).username(username).build();
        UserDto userDto = new UserDto(userId, username, username + "@example.com");
        WebSocketPrincipal principal = new WebSocketPrincipal(userDto);
        principal.setUserSession(userSession);
        WebSocketAuthentication auth = mock(WebSocketAuthentication.class);
        when(auth.getPrincipal()).thenReturn(principal);
        when(auth.getName()).thenReturn(username);
        return auth;
    }

    @Test
    public void testCanSendIntentSuccess() {
        UUID gameId = UUID.randomUUID();
        Authentication auth = createMockAuth(1L, "player1");
        UserSession session = ((WebSocketPrincipal) auth.getPrincipal()).getUserSession();

        when(userSessionService.isConnectedToGame(session)).thenReturn(true);
        when(userSessionService.isInGame(session, gameId.toString())).thenReturn(true);

        GameSession gameSession = GameSession.builder()
                .id(gameId)
                .playerA("player1")
                .playerB("player2")
                .state(GameSessionState.STARTED)
                .build();
        when(gameSessionRepository.findById(gameId)).thenReturn(Optional.of(gameSession));

        OnlinePlayerIntentRequestDto<?> intent = OnlinePlayerIntentRequestDto.builder()
                .gameSessionId(gameId.toString())
                .playerId(1L)
                .intentId("intent-1")
                .type(OnlinePlayerIntentRequestType.MOVE)
                .payload(new MoveIntentRequestPayload(1))
                .build();

        boolean result = gameAuthorizationService.canSendIntent(auth, gameId, intent);
        assertTrue(result);
    }

    @Test
    public void testCanSendIntentRejectsWhenUserDoesNotMatchPlayerId() {
        UUID gameId = UUID.randomUUID();
        Authentication auth = createMockAuth(2L, "player2");
        UserSession session = ((WebSocketPrincipal) auth.getPrincipal()).getUserSession();

        when(userSessionService.isConnectedToGame(session)).thenReturn(true);
        when(userSessionService.isInGame(session, gameId.toString())).thenReturn(true);

        GameSession gameSession = GameSession.builder()
                .id(gameId)
                .playerA("player1")
                .playerB("player2")
                .state(GameSessionState.STARTED)
                .build();
        when(gameSessionRepository.findById(gameId)).thenReturn(Optional.of(gameSession));

        // Intent says playerId is 1, but authenticated user is player2
        OnlinePlayerIntentRequestDto<?> intent = OnlinePlayerIntentRequestDto.builder()
                .gameSessionId(gameId.toString())
                .playerId(1L)
                .intentId("intent-1")
                .type(OnlinePlayerIntentRequestType.MOVE)
                .payload(new MoveIntentRequestPayload(1))
                .build();

        assertThrows(ProblemDetailException.class, () ->
                gameAuthorizationService.canSendIntent(auth, gameId, intent));
    }

    @Test
    public void testCanSendIntentRejectsWhenGameNotStarted() {
        UUID gameId = UUID.randomUUID();
        Authentication auth = createMockAuth(1L, "player1");
        UserSession session = ((WebSocketPrincipal) auth.getPrincipal()).getUserSession();

        when(userSessionService.isConnectedToGame(session)).thenReturn(true);
        when(userSessionService.isInGame(session, gameId.toString())).thenReturn(true);

        GameSession gameSession = GameSession.builder()
                .id(gameId)
                .playerA("player1")
                .playerB("player2")
                .state(GameSessionState.CREATED)
                .build();
        when(gameSessionRepository.findById(gameId)).thenReturn(Optional.of(gameSession));

        OnlinePlayerIntentRequestDto<?> intent = OnlinePlayerIntentRequestDto.builder()
                .gameSessionId(gameId.toString())
                .playerId(1L)
                .intentId("intent-1")
                .type(OnlinePlayerIntentRequestType.MOVE)
                .payload(new MoveIntentRequestPayload(1))
                .build();

        assertThrows(ProblemDetailException.class, () ->
                gameAuthorizationService.canSendIntent(auth, gameId, intent));
    }

    @Test
    public void testCanForfeitGameSuccess() {
        UUID gameId = UUID.randomUUID();
        Authentication auth = createMockAuth(1L, "player1");
        UserSession session = ((WebSocketPrincipal) auth.getPrincipal()).getUserSession();

        when(userSessionService.isConnectedToGame(session)).thenReturn(true);
        when(userSessionService.isInGame(session, gameId.toString())).thenReturn(true);

        GameSession gameSession = GameSession.builder()
                .id(gameId)
                .playerA("player1")
                .playerB("player2")
                .state(GameSessionState.STARTED)
                .build();
        when(gameSessionRepository.findById(gameId)).thenReturn(Optional.of(gameSession));

        boolean result = gameAuthorizationService.canForfeitGame(auth, gameId);
        assertTrue(result);
    }

    @Test
    public void testCanForfeitGameRejectsNonParticipant() {
        UUID gameId = UUID.randomUUID();
        Authentication auth = createMockAuth(3L, "player3");
        UserSession session = ((WebSocketPrincipal) auth.getPrincipal()).getUserSession();

        when(userSessionService.isConnectedToGame(session)).thenReturn(true);
        when(userSessionService.isInGame(session, gameId.toString())).thenReturn(true);

        GameSession gameSession = GameSession.builder()
                .id(gameId)
                .playerA("player1")
                .playerB("player2")
                .state(GameSessionState.STARTED)
                .build();
        when(gameSessionRepository.findById(gameId)).thenReturn(Optional.of(gameSession));

        assertThrows(ProblemDetailException.class, () ->
                gameAuthorizationService.canForfeitGame(auth, gameId));
    }

    @Test
    public void testCanRequestResyncSuccess() {
        UUID gameId = UUID.randomUUID();
        Authentication auth = createMockAuth(1L, "player1");
        UserSession session = ((WebSocketPrincipal) auth.getPrincipal()).getUserSession();

        when(userSessionService.isConnectedToGame(session)).thenReturn(true);
        when(userSessionService.isInGame(session, gameId.toString())).thenReturn(true);
        when(gameSessionRepository.existsById(gameId)).thenReturn(true);

        boolean result = gameAuthorizationService.canRequestResync(auth, gameId);
        assertTrue(result);
    }
}
