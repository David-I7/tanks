package com.tanks.server.websocket.gameplay;

import com.tanks.server.entities.User;
import com.tanks.server.entities.gameResult.GameOutcome;
import com.tanks.server.entities.gameResult.GameResult;
import com.tanks.server.repositories.GameResultRepository;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponseDto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.TerminalGameReason;
import com.tanks.server.websocket.dto.gameplay.diffResponse.states.TerminalGame;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.simulation.DefaultGameSimulation;
import com.tanks.server.websocket.gameplay.simulation.GameStateResponseFactory;
import com.tanks.server.websocket.gameplay.world.InitialWorldFactory;
import com.tanks.server.websocket.gameplay.world.TankState;
import com.tanks.server.websocket.gameplay.world.World;
import com.tanks.server.websocket.repositories.InMemoryGameSessionRepository;
import com.tanks.server.websocket.services.GameSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class MatchTerminationRulesTest {

    private GameContentCatalog contentCatalog;
    private InitialWorldFactory initialWorldFactory;
    private InMemoryGameSessionRepository gameSessionRepository;
    private UserRepository userRepository;
    private GameResultRepository gameResultRepository;
    private ApplicationEventPublisher eventPublisher;
    private GameSessionService gameSessionService;

    @BeforeEach
    public void setUp() {
        contentCatalog = new GameContentCatalog(new ObjectMapper());
        contentCatalog.init();
        initialWorldFactory = new InitialWorldFactory();
        gameSessionRepository = new InMemoryGameSessionRepository();
        userRepository = mock(UserRepository.class);
        gameResultRepository = mock(GameResultRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);

        User userA = User.builder().id(1L).username("PlayerA").email("a@test.com").build();
        User userB = User.builder().id(2L).username("PlayerB").email("b@test.com").build();
        when(userRepository.findByUsername("PlayerA")).thenReturn(Optional.of(userA));
        when(userRepository.findByUsername("PlayerB")).thenReturn(Optional.of(userB));

        GameStateResponseFactory stateResponseFactory = new GameStateResponseFactory(contentCatalog);
        gameSessionService = new GameSessionService(
                gameSessionRepository,
                null,
                null,
                null,
                eventPublisher,
                null,
                contentCatalog,
                initialWorldFactory,
                new DefaultGameSimulation(),
                stateResponseFactory,
                gameResultRepository,
                userRepository
        );
    }

    @Test
    public void testForfeitMatchTermination() {
        var content = contentCatalog.current();
        var worldSetup = initialWorldFactory.create(content, 0, "PlayerA", "PlayerB");
        UUID gameId = UUID.randomUUID();

        GameSession session = GameSession.builder()
                .id(gameId)
                .playerA("PlayerA")
                .playerB("PlayerB")
                .gameContentVersion(content.version())
                .world(worldSetup.world())
                .terrainModel(worldSetup.terrainModel())
                .state(GameSessionState.STARTED)
                .build();

        gameSessionRepository.save(session);

        gameSessionService.forfeitGame(gameId, "PlayerA");

        assertEquals(GameSessionState.ENDED, session.getState());
        assertEquals(2L, session.getWorld().match().winnerPlayerId());

        ArgumentCaptor<GameResult> captor = ArgumentCaptor.forClass(GameResult.class);
        verify(gameResultRepository).save(captor.capture());
        GameResult result = captor.getValue();
        assertEquals(GameOutcome.WIN, result.getOutcome());
        assertEquals("PlayerB", result.getWinner().getUsername());

        ArgumentCaptor<OnlineGameplayEvent> eventCaptor = ArgumentCaptor.forClass(OnlineGameplayEvent.class);
        verify(eventPublisher, atLeastOnce()).publishEvent(eventCaptor.capture());

        boolean foundTerminal = eventCaptor.getAllValues().stream()
                .anyMatch(e -> e.getPayload() instanceof OnlineDiffResponseDto diff
                        && diff.type() == com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineStateDiffResponseType.TERMINAL_GAME
                        && diff.payload() instanceof TerminalGame tg
                        && tg.reason() == TerminalGameReason.FORFEIT
                        && Long.valueOf(2L).equals(tg.winnerPlayerId()));

        assertTrue(foundTerminal, "TERMINAL_GAME diff with reason FORFEIT and winnerPlayerId=2 should be published");
    }

    @Test
    public void testSimultaneousDualTankDestructionDraw() {
        var content = contentCatalog.current();
        var worldSetup = initialWorldFactory.create(content, 0, "PlayerA", "PlayerB");
        UUID gameId = UUID.randomUUID();

        World world = worldSetup.world();
        TankState tankA = world.requireTankByPlayer(1L);
        TankState tankB = world.requireTankByPlayer(2L);
        tankA.health(0);
        tankB.health(0);

        GameSession session = GameSession.builder()
                .id(gameId)
                .playerA("PlayerA")
                .playerB("PlayerB")
                .gameContentVersion(content.version())
                .world(world)
                .terrainModel(worldSetup.terrainModel())
                .state(GameSessionState.STARTED)
                .pendingTurnTransitionAtServerTick(100L)
                .pendingTurnTransitionIntentId("intent-draw")
                .build();

        gameSessionRepository.save(session);

        gameSessionService.executePendingTurnTransition(session);

        assertEquals(GameSessionState.ENDED, session.getState());
        assertNull(session.getWorld().match().winnerPlayerId());

        ArgumentCaptor<GameResult> captor = ArgumentCaptor.forClass(GameResult.class);
        verify(gameResultRepository).save(captor.capture());
        GameResult result = captor.getValue();
        assertEquals(GameOutcome.DRAW, result.getOutcome());
        assertNull(result.getWinner());

        ArgumentCaptor<OnlineGameplayEvent> eventCaptor = ArgumentCaptor.forClass(OnlineGameplayEvent.class);
        verify(eventPublisher, atLeastOnce()).publishEvent(eventCaptor.capture());

        boolean foundDraw = eventCaptor.getAllValues().stream()
                .anyMatch(e -> e.getPayload() instanceof OnlineDiffResponseDto diff
                        && diff.type() == com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineStateDiffResponseType.TERMINAL_GAME
                        && diff.payload() instanceof TerminalGame tg
                        && tg.reason() == TerminalGameReason.DRAW
                        && tg.winnerPlayerId() == null);

        assertTrue(foundDraw, "TERMINAL_GAME diff with reason DRAW and winnerPlayerId=null should be published");
    }
}
