package com.tanks.server.websocket.security;

import tools.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.tanks.server.domain.Lobby;
import com.tanks.server.domain.LobbyState;
import com.tanks.server.domain.LobbyType;
import com.tanks.server.domain.Player;
import com.tanks.server.dto.response.LobbyActionResponseDto;
import com.tanks.server.dto.response.PlayerDto;
import com.tanks.server.repositories.InMemoryLobbyRepository;
import com.tanks.server.repositories.LobbyRepository;
import com.tanks.server.utils.ProblemDetailWriter;
import com.tanks.server.websocket.security.interceptors.LobbyHandshakeInterceptor;
import com.tanks.server.websocket.services.ClaimService;
import com.tanks.server.websocket.services.LobbyService;
import com.tanks.server.websocket.services.QuickMatchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class LobbyHandshakeInterceptorTest {

    private LobbyRepository lobbyRepository;
    private LobbyService lobbyService;
    private ClaimService claimService;
    private LobbyHandshakeInterceptor interceptor;

    @BeforeEach
    void setUp() {
        lobbyRepository = new InMemoryLobbyRepository();
        var quickMatchService = mock(QuickMatchService.class);
        var eventPublisher = mock(ApplicationEventPublisher.class);
        var pendingLobbiesCache = Caffeine.newBuilder().<UUID, Lobby>build();
        var pendingPlayerJoinLobbiesCache = Caffeine.newBuilder().<UUID, Player>build();
        lobbyService = new LobbyService(
                lobbyRepository,
                quickMatchService,
                eventPublisher,
                pendingLobbiesCache,
                pendingPlayerJoinLobbiesCache);
        claimService = new ClaimService();
        var problemDetailWriter = new ProblemDetailWriter(new ObjectMapper());
        interceptor = new LobbyHandshakeInterceptor(lobbyService, claimService, problemDetailWriter);
    }

    private ServerHttpResponse mockResponse() {
        ServerHttpResponse response = mock(ServerHttpResponse.class);
        when(response.getHeaders()).thenReturn(new org.springframework.http.HttpHeaders());
        try {
            when(response.getBody()).thenReturn(new java.io.ByteArrayOutputStream());
        } catch (java.io.IOException ignored) {}
        return response;
    }

    @Test
    void testMissingParametersFails() {
        ServerHttpRequest request = mock(ServerHttpRequest.class);
        ServerHttpResponse response = mockResponse();
        WebSocketHandler handler = mock(WebSocketHandler.class);
        when(request.getURI()).thenReturn(URI.create("http://localhost:8080/ws"));

        Map<String, Object> attributes = new HashMap<>();
        boolean result = interceptor.beforeHandshake(request, response, handler, attributes);

        assertFalse(result);
        verify(response).setStatusCode(HttpStatus.BAD_REQUEST);
    }

    @Test
    void testNonExistentLobbyFails() {
        ServerHttpRequest request = mock(ServerHttpRequest.class);
        ServerHttpResponse response = mockResponse();
        WebSocketHandler handler = mock(WebSocketHandler.class);
        UUID lobbyId = UUID.randomUUID();
        UUID playerId = UUID.randomUUID();
        when(request.getURI()).thenReturn(URI.create("http://localhost:8080/ws?lobbyId=" + lobbyId + "&playerId=" + playerId));

        Map<String, Object> attributes = new HashMap<>();
        boolean result = interceptor.beforeHandshake(request, response, handler, attributes);

        assertFalse(result);
        verify(response).setStatusCode(HttpStatus.NOT_FOUND);
    }

    @Test
    void testValidHostConnectsAndPromotesLobby() {
        LobbyActionResponseDto created = lobbyService.createPendingLobby("Ace", "vanguard-cyber", LobbyType.PRIVATE);

        ServerHttpRequest request = mock(ServerHttpRequest.class);
        ServerHttpResponse response = mockResponse();
        WebSocketHandler handler = mock(WebSocketHandler.class);
        when(request.getURI()).thenReturn(URI.create("http://localhost:8080/ws?lobbyId=" + created.lobbyId() + "&playerId=" + created.playerId()));

        Map<String, Object> attributes = new HashMap<>();
        boolean result = interceptor.beforeHandshake(request, response, handler, attributes);

        assertTrue(result);
        PlayerDto playerDto = (PlayerDto) attributes.get(LobbyHandshakeInterceptor.ATTR_PLAYER_DTO);
        assertNotNull(playerDto);
        assertEquals(created.playerId(), playerDto.id());
        assertEquals("Ace", playerDto.nickname());
        assertEquals(created.lobbyId(), attributes.get(LobbyHandshakeInterceptor.ATTR_LOBBY_ID));

        Lobby activeLobby = lobbyService.findById(created.lobbyId());
        assertEquals(LobbyState.WAITING_FOR_PLAYERS, activeLobby.getState());
    }

    @Test
    void testPendingOpponentConnectsAndConfirmsJoin() {
        LobbyActionResponseDto hostCreated = lobbyService.createPendingLobby("Ace", "vanguard-cyber", LobbyType.PRIVATE);
        lobbyService.confirmLobbyCreation(hostCreated.lobbyId(), hostCreated.playerId());
        LobbyActionResponseDto opponentJoined = lobbyService.join(hostCreated.lobbyId(), "Bob", "specter");

        ServerHttpRequest request = mock(ServerHttpRequest.class);
        ServerHttpResponse response = mockResponse();
        WebSocketHandler handler = mock(WebSocketHandler.class);
        when(request.getURI()).thenReturn(URI.create("http://localhost:8080/ws?lobbyId=" + opponentJoined.lobbyId() + "&playerId=" + opponentJoined.playerId()));

        Map<String, Object> attributes = new HashMap<>();
        boolean result = interceptor.beforeHandshake(request, response, handler, attributes);

        assertTrue(result);
        PlayerDto playerDto = (PlayerDto) attributes.get(LobbyHandshakeInterceptor.ATTR_PLAYER_DTO);
        assertNotNull(playerDto);
        assertEquals(opponentJoined.playerId(), playerDto.id());
        assertEquals("Bob", playerDto.nickname());

        Lobby activeLobby = lobbyService.findById(hostCreated.lobbyId());
        assertEquals(LobbyState.READY_TO_START, activeLobby.getState());
        assertNotNull(activeLobby.getOpponent());
        assertEquals(opponentJoined.playerId(), activeLobby.getOpponent().id());
    }

    @Test
    void testAlreadyConnectedPlayerFails() {
        LobbyActionResponseDto created = lobbyService.createPendingLobby("Ace", "vanguard-cyber", LobbyType.PRIVATE);
        claimService.claimSocket(created.playerId(), "socket-1");

        ServerHttpRequest request = mock(ServerHttpRequest.class);
        ServerHttpResponse response = mockResponse();
        WebSocketHandler handler = mock(ServerHttpResponse.class != null ? WebSocketHandler.class : WebSocketHandler.class);
        when(request.getURI()).thenReturn(URI.create("http://localhost:8080/ws?lobbyId=" + created.lobbyId() + "&playerId=" + created.playerId()));

        Map<String, Object> attributes = new HashMap<>();
        boolean result = interceptor.beforeHandshake(request, response, handler, attributes);

        assertFalse(result);
        verify(response).setStatusCode(HttpStatus.BAD_REQUEST);
    }
}
