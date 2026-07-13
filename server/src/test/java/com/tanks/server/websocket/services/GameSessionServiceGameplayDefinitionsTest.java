package com.tanks.server.websocket.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import com.tanks.server.repositories.GameResultRepository;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.gameplay.OnlineGameplayDefinitionCatalog;
import com.tanks.server.websocket.gameplay.OnlineInitialStateFactory;
import com.tanks.server.websocket.gameplay.OnlineGameplayRules;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;

class GameSessionServiceGameplayDefinitionsTest {

    @Test
    @DisplayName("Game Session creation stores the server-owned Gameplay Definition Version")
    void createStoresServerOwnedGameplayDefinitionVersion() {
        GameSessionRepository gameRepository = mock(GameSessionRepository.class);
        UserSessionService userSessionService = mock(UserSessionService.class);
        LobbyRepository lobbyRepository = mock(LobbyRepository.class);
        QuickMatchService quickMatchService = mock(QuickMatchService.class);
        ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
        RedisClaimService redisClaimService = mock(RedisClaimService.class);
        GameResultRepository gameResultRepository = mock(GameResultRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        OnlineGameplayDefinitionCatalog gameplayDefinitionCatalog = new OnlineGameplayDefinitionCatalog();
        OnlineGameplayRules gameplayRules = new OnlineGameplayRules(gameplayDefinitionCatalog);

        GameSessionService service = new GameSessionService(
                gameRepository,
                userSessionService,
                lobbyRepository,
                quickMatchService,
                eventPublisher,
                redisClaimService,
                gameplayRules,
                new OnlineInitialStateFactory(gameplayRules),
                gameResultRepository,
                userRepository);

        UUID lobbyId = UUID.randomUUID();
        Lobby lobby = Lobby.builder()
                .id(lobbyId)
                .hostId(1L)
                .opponentId(2L)
                .type(LobbyType.PRIVATE)
                .status(LobbyStatus.READY)
                .build();
        UserSession host = UserSession.builder().id(1L).username("host").build();
        UserSession opponent = UserSession.builder().id(2L).username("opponent").build();

        when(redisClaimService.claimGameCreation(lobbyId, 1L)).thenReturn(true);
        when(lobbyRepository.findById(lobbyId)).thenReturn(Optional.of(lobby));
        when(userSessionService.findById(1L)).thenReturn(host);
        when(userSessionService.findById(2L)).thenReturn(opponent);
        when(gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GameSession created = service.create(lobby);

        assertThat(created.getGameplayDefinitionVersion()).isEqualTo(gameplayDefinitionCatalog.current().version());
        verify(gameRepository).save(any(GameSession.class));
    }
}
