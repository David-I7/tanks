package com.tanks.server.websocket.services;

import com.tanks.server.websocket.dto.UserSessionStatusDto;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;
import com.tanks.server.websocket.repositories.UserSessionRepository;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.security.services.GameAuthorizationService;
import com.tanks.server.websocket.security.services.LobbyAuthorizationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserSessionServiceResumeTest {

    @Test
    @DisplayName("Auth status resumes a live Lobby Session with lightweight lobby state")
    void authStatusResumesLiveLobby() {
        TestHarness harness = new TestHarness();
        UUID lobbyId = UUID.randomUUID();
        UserSession userSession = UserSession.builder()
                .id(1L)
                .username("host")
                .state(UserSessionState.IN_LOBBY)
                .lobbyId(lobbyId)
                .build();
        Lobby lobby = Lobby.builder()
                .id(lobbyId)
                .hostId(1L)
                .opponentId(2L)
                .build();

        when(harness.userSessionRepository.findById(1L)).thenReturn(Optional.of(userSession));
        when(harness.lobbyRepository.findById(lobbyId)).thenReturn(Optional.of(lobby));

        UserSessionStatusDto status = harness.userSessionService.getUserSessionStatus(1L);

        assertThat(status.getState()).isEqualTo(UserSessionState.IN_LOBBY);
        assertThat(status.getLobbyId()).isEqualTo(lobbyId);
        assertThat(status.getLobbyHostId()).isEqualTo(1L);
        assertThat(status.getLobbyPlayerCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("Auth status resumes a live Game Session")
    void authStatusResumesLiveGame() {
        TestHarness harness = new TestHarness();
        UUID gameId = UUID.randomUUID();
        UserSession userSession = UserSession.builder()
                .id(1L)
                .username("host")
                .state(UserSessionState.IN_GAME)
                .gameSessionId(gameId)
                .build();
        GameSession gameSession = GameSession.builder()
                .id(gameId)
                .playerA("host")
                .playerB("opponent")
                .build();

        when(harness.userSessionRepository.findById(1L)).thenReturn(Optional.of(userSession));
        when(harness.gameSessionRepository.findById(gameId)).thenReturn(Optional.of(gameSession));

        UserSessionStatusDto status = harness.userSessionService.getUserSessionStatus(1L);

        assertThat(status.getState()).isEqualTo(UserSessionState.IN_GAME);
        assertThat(status.getGameId()).isEqualTo(gameId);
    }

    @Test
    @DisplayName("Auth status falls back to idle when live Lobby state is missing")
    void authStatusFallsBackToIdleWhenLiveStateIsMissing() {
        TestHarness harness = new TestHarness();
        UUID lobbyId = UUID.randomUUID();
        UserSession userSession = UserSession.builder()
                .id(1L)
                .username("host")
                .state(UserSessionState.IN_LOBBY)
                .lobbyId(lobbyId)
                .build();

        when(harness.userSessionRepository.findById(1L)).thenReturn(Optional.of(userSession));
        when(harness.lobbyRepository.findById(lobbyId)).thenReturn(Optional.empty());
        when(harness.userSessionRepository.save(any(UserSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserSessionStatusDto status = harness.userSessionService.getUserSessionStatus(1L);

        assertThat(status.getState()).isEqualTo(UserSessionState.IDLE);
        assertThat(status.getLobbyId()).isNull();
        assertThat(status.getGameId()).isNull();
        assertThat(userSession.getState()).isEqualTo(UserSessionState.IDLE);
        verify(harness.userSessionRepository).save(userSession);
    }

    @Test
    @DisplayName("Lobby and Game resume topics still reject users outside the server-owned session")
    void topicAuthorizationRejectsWrongSession() {
        TestHarness harness = new TestHarness();
        UUID lobbyId = UUID.randomUUID();
        UUID gameId = UUID.randomUUID();
        UserSession userSession = UserSession.builder()
                .id(1L)
                .username("host")
                .state(UserSessionState.IN_LOBBY)
                .lobbyId(lobbyId)
                .build();
        WebSocketPrincipal principal = new WebSocketPrincipal(new com.tanks.server.dto.UserDto(1L, "host", "host@test.com"));
        principal.setUserSession(userSession);
        TestingAuthenticationToken authentication = new TestingAuthenticationToken(principal, null);

        assertThatThrownBy(() -> harness.lobbyAuthorizationService.canJoinTopic(
                authentication,
                "/topic/lobby/" + UUID.randomUUID()))
                .isInstanceOf(ProblemDetailException.class)
                .hasMessageContaining("User is not in the provided lobby");

        assertThatThrownBy(() -> harness.gameAuthorizationService.canJoinTopic(
                authentication,
                "/topic/game/" + gameId))
                .isInstanceOf(ProblemDetailException.class)
                .hasMessageContaining("User is not in the provided game");
    }

    private static class TestHarness {
        private final UserSessionRepository userSessionRepository = mock(UserSessionRepository.class);
        private final LobbyRepository lobbyRepository = mock(LobbyRepository.class);
        private final GameSessionRepository gameSessionRepository = mock(GameSessionRepository.class);
        private final UserSessionService userSessionService = new UserSessionService(
                userSessionRepository,
                lobbyRepository,
                gameSessionRepository);
        private final LobbyAuthorizationService lobbyAuthorizationService =
                new LobbyAuthorizationService(userSessionService);
        private final GameAuthorizationService gameAuthorizationService =
                new GameAuthorizationService(mock(LobbyService.class), userSessionService);
    }
}
