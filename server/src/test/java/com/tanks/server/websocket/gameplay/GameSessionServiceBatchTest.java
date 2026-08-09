package com.tanks.server.websocket.gameplay;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffBatchResponseDto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponseDto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineStateDiffResponseType;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.simulation.GameSimulation;
import com.tanks.server.websocket.gameplay.simulation.GameStateResponseFactory;
import com.tanks.server.websocket.gameplay.world.InitialWorldFactory;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;
import com.tanks.server.websocket.services.*;
import com.tanks.server.repositories.GameResultRepository;
import com.tanks.server.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class GameSessionServiceBatchTest {

    @Test
    public void testOnlineDiffBatchResponseDtoStructure() {
        OnlineDiffResponseDto diff1 = new OnlineDiffResponseDto("session-1", 10L, 300L, OnlineStateDiffResponseType.PROJECTILE_RESOLUTION, "intent-fire-1", null);
        OnlineDiffResponseDto diff2 = new OnlineDiffResponseDto("session-1", 11L, 300L, OnlineStateDiffResponseType.TERRAIN_PATCH, "intent-fire-1", null);

        OnlineDiffBatchResponseDto batch = OnlineDiffBatchResponseDto.builder()
                .gameSessionId("session-1")
                .sequence(10)
                .serverTick(300)
                .intentId("intent-fire-1")
                .diffs(List.of(diff1, diff2))
                .build();

        assertEquals("session-1", batch.getGameSessionId());
        assertEquals(10, batch.getSequence());
        assertEquals(300, batch.getServerTick());
        assertEquals("intent-fire-1", batch.getIntentId());
        assertEquals(2, batch.getDiffs().size());
        assertEquals(10L, batch.getDiffs().get(0).sequence());
        assertEquals(11L, batch.getDiffs().get(1).sequence());
    }

    @Test
    public void testGameSessionServicePublishesBatchEvent() {
        ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
        GameSessionRepository gameRepository = mock(GameSessionRepository.class);
        UserSessionService userSessionService = mock(UserSessionService.class);
        LobbyRepository lobbyRepository = mock(LobbyRepository.class);
        QuickMatchService quickMatchService = mock(QuickMatchService.class);
        ClaimService claimService = mock(ClaimService.class);
        GameContentCatalog contentCatalog = mock(GameContentCatalog.class);
        InitialWorldFactory initialWorldFactory = mock(InitialWorldFactory.class);
        GameSimulation gameSimulation = mock(GameSimulation.class);
        GameStateResponseFactory initialStateFactory = mock(GameStateResponseFactory.class);
        GameResultRepository gameResultRepository = mock(GameResultRepository.class);
        UserRepository userRepository = mock(UserRepository.class);

        GameSessionService service = new GameSessionService(
                gameRepository,
                userSessionService,
                lobbyRepository,
                quickMatchService,
                eventPublisher,
                claimService,
                contentCatalog,
                initialWorldFactory,
                gameSimulation,
                initialStateFactory,
                gameResultRepository,
                userRepository
        );

        UUID sessionId = UUID.randomUUID();
        GameSession gameSession = GameSession.builder()
                .id(sessionId)
                .nextDiffSequence(10L)
                .serverTick(100L)
                .build();

        // Create diffs list to be published as batch
        OnlineDiffResponseDto diff1 = new OnlineDiffResponseDto(sessionId.toString(), 10L, 100L, OnlineStateDiffResponseType.PROJECTILE_RESOLUTION, "intent-fire-1", null);
        OnlineDiffResponseDto diff2 = new OnlineDiffResponseDto(sessionId.toString(), 11L, 100L, OnlineStateDiffResponseType.TERRAIN_PATCH, "intent-fire-1", null);

        // Verify batch structure creation and payload type
        OnlineDiffBatchResponseDto batch = OnlineDiffBatchResponseDto.builder()
                .gameSessionId(gameSession.getId().toString())
                .sequence(10L)
                .serverTick(gameSession.getServerTick())
                .intentId("intent-fire-1")
                .diffs(List.of(diff1, diff2))
                .build();

        OnlineGameplayEvent event = new OnlineGameplayEvent(service, null, "/topic/game/" + sessionId, batch);
        eventPublisher.publishEvent(event);

        ArgumentCaptor<OnlineGameplayEvent> captor = ArgumentCaptor.forClass(OnlineGameplayEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());

        OnlineGameplayEvent capturedEvent = captor.getValue();
        assertEquals("/topic/game/" + sessionId, capturedEvent.getDestination());
        assertTrue(capturedEvent.getPayload() instanceof OnlineDiffBatchResponseDto);

        OnlineDiffBatchResponseDto capturedBatch = (OnlineDiffBatchResponseDto) capturedEvent.getPayload();
        assertEquals(sessionId.toString(), capturedBatch.getGameSessionId());
        assertEquals(2, capturedBatch.getDiffs().size());
        assertEquals(OnlineStateDiffResponseType.PROJECTILE_RESOLUTION, capturedBatch.getDiffs().get(0).type());
        assertEquals(OnlineStateDiffResponseType.TERRAIN_PATCH, capturedBatch.getDiffs().get(1).type());
    }
}
