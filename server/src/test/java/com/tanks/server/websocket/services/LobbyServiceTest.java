package com.tanks.server.websocket.services;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.tanks.server.domain.Lobby;
import com.tanks.server.domain.LobbyState;
import com.tanks.server.domain.LobbyType;
import com.tanks.server.domain.Player;
import com.tanks.server.dto.response.LobbyActionResponseDto;
import com.tanks.server.repositories.InMemoryLobbyRepository;
import com.tanks.server.repositories.LobbyRepository;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class LobbyServiceTest {

    private LobbyRepository lobbyRepository;
    private QuickMatchService quickMatchService;
    private ApplicationEventPublisher eventPublisher;
    private LobbyService lobbyService;

    @BeforeEach
    void setUp() {
        lobbyRepository = new InMemoryLobbyRepository();
        quickMatchService = mock(QuickMatchService.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        Cache<UUID, Lobby> pendingCache = Caffeine.newBuilder().build();
        Cache<UUID, Player> pendingPlayerJoinCache = Caffeine.newBuilder().build();
        lobbyService = new LobbyService(
                lobbyRepository,
                quickMatchService,
                eventPublisher,
                pendingCache,
                pendingPlayerJoinCache);
    }

    @Test
    void testCreatePendingLobby() {
        LobbyActionResponseDto response = lobbyService.createPendingLobby("Ace", "vanguard-cyber", LobbyType.PRIVATE);

        assertNotNull(response.lobbyId());
        assertNotNull(response.playerId());

        Optional<Lobby> pendingOpt = lobbyService.findActiveOrPendingLobby(response.lobbyId());
        assertTrue(pendingOpt.isPresent());
        Lobby lobby = pendingOpt.get();
        assertEquals(LobbyState.CREATED, lobby.getState());
        assertEquals("Ace", lobby.getHost().nickname());
        assertEquals(response.playerId(), lobby.getHost().id());
    }

    @Test
    void testConfirmLobbyCreation() {
        LobbyActionResponseDto response = lobbyService.createPendingLobby("Ace", "vanguard-cyber", LobbyType.PRIVATE);
        Lobby promoted = lobbyService.confirmLobbyCreation(response.lobbyId(), response.playerId());

        assertEquals(LobbyState.WAITING_FOR_PLAYERS, promoted.getState());
        assertTrue(lobbyRepository.existsById(response.lobbyId()));
    }

    @Test
    void testJoinLobbyAndConfirmSuccess() {
        LobbyActionResponseDto hostResp = lobbyService.createPendingLobby("Ace", "vanguard-cyber", LobbyType.PRIVATE);
        lobbyService.confirmLobbyCreation(hostResp.lobbyId(), hostResp.playerId());

        LobbyActionResponseDto opponentResp = lobbyService.join(hostResp.lobbyId(), "Bob", "specter");
        assertNotNull(opponentResp.playerId());

        Lobby lobby = lobbyService.confirmPlayerJoin(hostResp.lobbyId(), opponentResp.playerId());
        assertEquals(LobbyState.READY_TO_START, lobby.getState());
        assertEquals("Bob", lobby.getOpponent().nickname());
        assertEquals(opponentResp.playerId(), lobby.getOpponent().id());
    }

    @Test
    void testJoinFullLobbyThrowsException() {
        LobbyActionResponseDto hostResp = lobbyService.createPendingLobby("Ace", "vanguard-cyber", LobbyType.PRIVATE);
        lobbyService.confirmLobbyCreation(hostResp.lobbyId(), hostResp.playerId());
        LobbyActionResponseDto oppResp = lobbyService.join(hostResp.lobbyId(), "Bob", "specter");
        lobbyService.confirmPlayerJoin(hostResp.lobbyId(), oppResp.playerId());

        assertThrows(ProblemDetailException.class, () ->
                lobbyService.join(hostResp.lobbyId(), "Charlie", "heavy-armor")
        );
    }

    @Test
    void testQuickMatchCreatesPendingWhenNoMatch() {
        when(quickMatchService.getBestQuickMatchNotInCache()).thenReturn(Optional.empty());

        LobbyActionResponseDto response = lobbyService.joinQuickMatch("Ace", "vanguard-cyber");
        assertNotNull(response.lobbyId());
        assertNotNull(response.playerId());

        Optional<Lobby> lobbyOpt = lobbyService.findActiveOrPendingLobby(response.lobbyId());
        assertTrue(lobbyOpt.isPresent());
        assertEquals(LobbyType.PUBLIC, lobbyOpt.get().getType());
    }

    @Test
    void testRemoveSolePlayerDeletesLobby() {
        LobbyActionResponseDto hostResp = lobbyService.createPendingLobby("Ace", "vanguard-cyber", LobbyType.PRIVATE);
        lobbyService.confirmLobbyCreation(hostResp.lobbyId(), hostResp.playerId());

        lobbyService.removePlayer(hostResp.lobbyId(), hostResp.playerId());
        assertFalse(lobbyRepository.existsById(hostResp.lobbyId()));
    }

    @Test
    void testHostLeavePromotesOpponent() {
        LobbyActionResponseDto hostResp = lobbyService.createPendingLobby("Ace", "vanguard-cyber", LobbyType.PRIVATE);
        lobbyService.confirmLobbyCreation(hostResp.lobbyId(), hostResp.playerId());
        LobbyActionResponseDto oppResp = lobbyService.join(hostResp.lobbyId(), "Bob", "specter");
        lobbyService.confirmPlayerJoin(hostResp.lobbyId(), oppResp.playerId());

        lobbyService.removePlayer(hostResp.lobbyId(), hostResp.playerId());

        Lobby lobby = lobbyService.findById(hostResp.lobbyId());
        assertEquals("Bob", lobby.getHost().nickname());
        assertEquals(oppResp.playerId(), lobby.getHost().id());
        assertNull(lobby.getOpponent());
        assertEquals(LobbyState.WAITING_FOR_PLAYERS, lobby.getState());
    }
}
