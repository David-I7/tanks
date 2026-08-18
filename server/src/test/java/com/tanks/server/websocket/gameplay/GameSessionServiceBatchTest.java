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

    @Test
    public void testTurnStartBatchResetsActiveTankFuel() {
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

        com.tanks.server.websocket.gameplay.content.definitions.TankDefinition tankDef =
                new com.tanks.server.websocket.gameplay.content.definitions.TankDefinition(
                        "vanguard-cyber", "Vanguard Cyber", 100, 240, 24, 1, 5, 24, 24, null, List.of("basicShell")
                );
        com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition worldDef =
                new com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition(
                        "forest", 2400, 768, 30, 260.0, 0.033, 10, 15, null, null, -50.0, 50.0
                );
        com.tanks.server.websocket.gameplay.content.GameContent content =
                new com.tanks.server.websocket.gameplay.content.GameContent("v1.0", worldDef, java.util.Map.of("vanguard-cyber", tankDef), java.util.Map.of(), null);
        when(contentCatalog.require("v1.0")).thenReturn(content);

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
        com.tanks.server.websocket.gameplay.world.World world = new com.tanks.server.websocket.gameplay.world.World();
        com.tanks.server.websocket.gameplay.world.TankState tank2 = com.tanks.server.websocket.gameplay.world.TankState.builder()
                .entityId(2L)
                .playerId(2L)
                .definitionId("vanguard-cyber")
                .position(new com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto(1800, 400))
                .fuel(10) // Depleted fuel
                .health(100)
                .build();
        world.tanks().put(2L, tank2);
        world.match().activePlayerId(1L);
        world.match().turnNumber(1);

        GameSession gameSession = GameSession.builder()
                .id(sessionId)
                .gameContentVersion("v1.0")
                .world(world)
                .nextDiffSequence(5L)
                .serverTick(100L)
                .build();

        service.publishTurnStartBatch(gameSession, 1L, 2L);

        // Verify that tank2's fuel has been reset to maxFuel (240)
        assertEquals(240, tank2.fuel());
    }

    @Test
    public void testShotOutcomeBatchSchedulesPendingTurnTransition() {
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

        com.tanks.server.websocket.gameplay.content.definitions.TankDefinition tankDef =
                new com.tanks.server.websocket.gameplay.content.definitions.TankDefinition(
                        "vanguard-cyber", "Vanguard Cyber", 100, 240, 24, 1, 5, 24, 24, null, List.of("basicShell")
                );
        com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition worldDef =
                new com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition(
                        "forest", 2400, 768, 30, 260.0, 0.033, 10, 15, null, null, -50.0, 50.0
                );
        com.tanks.server.websocket.gameplay.content.definitions.ProjectileDefinition projDef =
                new com.tanks.server.websocket.gameplay.content.definitions.ProjectileDefinition(
                        "basicShell", "Basic Shell", "BS", 4, 1.0, 1.0, 0, null, null, null, null
                );
        com.tanks.server.websocket.gameplay.content.GameContent content =
                new com.tanks.server.websocket.gameplay.content.GameContent("v1.0", worldDef, java.util.Map.of("vanguard-cyber", tankDef), java.util.Map.of("basicShell", projDef), null);
        when(contentCatalog.require("v1.0")).thenReturn(content);

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
        com.tanks.server.websocket.gameplay.world.World world = new com.tanks.server.websocket.gameplay.world.World();
        com.tanks.server.websocket.gameplay.world.TankState tank1 = com.tanks.server.websocket.gameplay.world.TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("vanguard-cyber")
                .position(new com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto(200, 400))
                .fuel(240)
                .health(100)
                .build();
        com.tanks.server.websocket.gameplay.world.TankState tank2 = com.tanks.server.websocket.gameplay.world.TankState.builder()
                .entityId(2L)
                .playerId(2L)
                .definitionId("vanguard-cyber")
                .position(new com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto(1800, 400))
                .fuel(240)
                .health(100)
                .build();
        world.tanks().put(1L, tank1);
        world.tanks().put(2L, tank2);
        world.match().activePlayerId(1L);
        world.match().turnNumber(1);

        GameSession gameSession = GameSession.builder()
                .id(sessionId)
                .gameContentVersion("v1.0")
                .world(world)
                .nextDiffSequence(5L)
                .serverTick(100L)
                .build();

        var projectileResolution = com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.ProjectileResolution.builder()
                .projectileEntityId(10L)
                .ownerPlayerId(1L)
                .projectileDefinitionId("basicShell")
                .launch(new com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto(200, 400))
                .trajectory(List.of(
                        new com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto(200, 400),
                        new com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto(400, 300),
                        new com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto(600, 400)
                ))
                .impact(new com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto(600, 400))
                .damagedTanks(List.of())
                .subMunitions(List.of())
                .build();

        when(gameSimulation.fire(any(), any(), any(), any(), anyLong(), anyLong(), any())).thenReturn(projectileResolution);
        when(gameSimulation.deformTerrain(any(), any(), any(), any(), any())).thenReturn(new com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.TerrainPatch(List.of()));
        when(gameSimulation.settleUnsupportedTanks(any(), any(), any(), anyLong())).thenReturn(List.of());

        var firePayload = new com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.FireIntentIntentRequestPayload(-Math.PI / 4, 300);
        var intent = com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestDto.<com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.FireIntentIntentRequestPayload>builder()
                .gameSessionId(sessionId.toString())
                .playerId(1L)
                .intentId("intent-fire-1")
                .type(com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestType.FIRE)
                .lastConfirmedDiffSequence(5L)
                .lastConfirmedDiffServerTick(100L)
                .payload(firePayload)
                .build();

        service.publishShotOutcomeBatch(gameSession, intent, firePayload);

        // Verify that pendingTurnTransitionAtServerTick is scheduled into the future (serverTick + animation ticks)
        assertTrue(gameSession.getPendingTurnTransitionAtServerTick() > 100L);
        assertEquals("intent-fire-1", gameSession.getPendingTurnTransitionIntentId());

        // Verify the published batch contains PROJECTILE_RESOLUTION and TERRAIN_PATCH, but NOT TURN_TRANSITION
        ArgumentCaptor<OnlineGameplayEvent> captor = ArgumentCaptor.forClass(OnlineGameplayEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());

        OnlineDiffBatchResponseDto batch = (OnlineDiffBatchResponseDto) captor.getValue().getPayload();
        assertNotNull(batch);
        assertEquals(2, batch.getDiffs().size());
        assertTrue(batch.getDiffs().stream().noneMatch(d -> d.type() == OnlineStateDiffResponseType.TURN_TRANSITION));
    }

    @Test
    public void testAcceptPlayerIntentProcessesAndSaves() {
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

        com.tanks.server.websocket.gameplay.content.definitions.TankDefinition tankDef =
                new com.tanks.server.websocket.gameplay.content.definitions.TankDefinition(
                        "vanguard-cyber", "Vanguard Cyber", 100, 240, 24, 1, 5, 24, 24, null, List.of("basicShell")
                );
        com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition worldDef =
                new com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition(
                        "forest", 2400, 768, 30, 260.0, 0.033, 10, 15, null, null, -50.0, 50.0
                );
        com.tanks.server.websocket.gameplay.content.definitions.ValidationRules validation =
                new com.tanks.server.websocket.gameplay.content.definitions.ValidationRules(10.0, 1000.0, -Math.PI, 0.0);
        com.tanks.server.websocket.gameplay.content.GameContent content =
                new com.tanks.server.websocket.gameplay.content.GameContent("v1.0", worldDef, java.util.Map.of("vanguard-cyber", tankDef), java.util.Map.of(), validation);
        when(contentCatalog.require("v1.0")).thenReturn(content);

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
        com.tanks.server.websocket.gameplay.world.World world = new com.tanks.server.websocket.gameplay.world.World();
        com.tanks.server.websocket.gameplay.world.TankState tank1 = com.tanks.server.websocket.gameplay.world.TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("vanguard-cyber")
                .position(new com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto(200, 400))
                .fuel(240)
                .health(100)
                .build();
        world.tanks().put(1L, tank1);
        world.match().activePlayerId(1L);
        world.match().turnNumber(1);

        GameSession gameSession = GameSession.builder()
                .id(sessionId)
                .playerA("player1")
                .playerB("player2")
                .gameContentVersion("v1.0")
                .world(world)
                .state(com.tanks.server.websocket.entities.gameSession.GameSessionState.STARTED)
                .nextDiffSequence(2L)
                .turnStartDiffSequence(1L)
                .serverTick(100L)
                .build();

        when(gameRepository.findById(sessionId)).thenReturn(java.util.Optional.of(gameSession));

        var aimPayload = new com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.AimIntentRequestPayload(-Math.PI / 4, 300);
        var intent = com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestDto.<com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.AimIntentRequestPayload>builder()
                .gameSessionId(sessionId.toString())
                .playerId(1L)
                .intentId("intent-aim-1")
                .type(com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestType.AIM)
                .lastConfirmedDiffSequence(1L)
                .lastConfirmedDiffServerTick(100L)
                .payload(aimPayload)
                .build();

        boolean processed = service.acceptPlayerIntent(sessionId, intent);

        assertTrue(processed);
        verify(gameRepository).save(gameSession);
        assertEquals(-Math.PI / 4, tank1.aimAngle());
        assertEquals(300.0, tank1.power());
    }

    @Test
    public void testForfeitGameEndsSessionAndAwardsWin() {
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

        com.tanks.server.entities.User userA = com.tanks.server.entities.User.builder().id(1L).username("player1").build();
        com.tanks.server.entities.User userB = com.tanks.server.entities.User.builder().id(2L).username("player2").build();
        when(userRepository.findByUsername("player1")).thenReturn(java.util.Optional.of(userA));
        when(userRepository.findByUsername("player2")).thenReturn(java.util.Optional.of(userB));

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
        com.tanks.server.websocket.gameplay.world.World world = new com.tanks.server.websocket.gameplay.world.World();
        GameSession gameSession = GameSession.builder()
                .id(sessionId)
                .playerA("player1")
                .playerB("player2")
                .gameContentVersion("v1.0")
                .world(world)
                .state(com.tanks.server.websocket.entities.gameSession.GameSessionState.STARTED)
                .nextDiffSequence(2L)
                .serverTick(100L)
                .createdAt(java.time.OffsetDateTime.now())
                .startedAt(java.time.OffsetDateTime.now())
                .build();

        when(gameRepository.findById(sessionId)).thenReturn(java.util.Optional.of(gameSession));

        service.forfeitGame(sessionId, "player1");

        assertEquals(com.tanks.server.websocket.entities.gameSession.GameSessionState.ENDED, gameSession.getState());
        assertEquals(2L, gameSession.getWorld().match().winnerPlayerId());
        verify(gameResultRepository).save(any());
        verify(eventPublisher).publishEvent(any(OnlineGameplayEvent.class));
    }

    @Test
    public void testSendResyncStateToPlayerPublishesDiff() {
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
                .playerA("player1")
                .playerB("player2")
                .state(com.tanks.server.websocket.entities.gameSession.GameSessionState.STARTED)
                .build();

        when(gameRepository.findById(sessionId)).thenReturn(java.util.Optional.of(gameSession));
        OnlineDiffResponseDto resyncDiff = new OnlineDiffResponseDto(sessionId.toString(), 1L, 0L, OnlineStateDiffResponseType.RESYNC_STATE, null, null);
        when(initialStateFactory.createResyncForPlayer(eq(gameSession), eq(com.tanks.server.websocket.dto.gameplay.diffResponse.enums.ResyncReason.MISSED_DIFF), eq(1L)))
                .thenReturn(resyncDiff);

        service.sendResyncStateToPlayer(sessionId, "player1", com.tanks.server.websocket.dto.gameplay.diffResponse.enums.ResyncReason.MISSED_DIFF);

        ArgumentCaptor<OnlineGameplayEvent> captor = ArgumentCaptor.forClass(OnlineGameplayEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertEquals("player1", captor.getValue().getUsername());
        assertEquals("/queue/replies", captor.getValue().getDestination());
        assertEquals(resyncDiff, captor.getValue().getPayload());
    }

    @Test
    public void testFinalizeMatchTimeExpiredDraw() {
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

        com.tanks.server.entities.User userA = com.tanks.server.entities.User.builder().id(1L).username("player1").build();
        com.tanks.server.entities.User userB = com.tanks.server.entities.User.builder().id(2L).username("player2").build();
        when(userRepository.findByUsername("player1")).thenReturn(java.util.Optional.of(userA));
        when(userRepository.findByUsername("player2")).thenReturn(java.util.Optional.of(userB));

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
        com.tanks.server.websocket.gameplay.world.World world = new com.tanks.server.websocket.gameplay.world.World();
        GameSession gameSession = GameSession.builder()
                .id(sessionId)
                .playerA("player1")
                .playerB("player2")
                .world(world)
                .nextDiffSequence(2L)
                .serverTick(100L)
                .createdAt(java.time.OffsetDateTime.now())
                .startedAt(java.time.OffsetDateTime.now())
                .build();

        service.finalizeMatchTimeExpired(gameSession, null);

        assertEquals(com.tanks.server.websocket.entities.gameSession.GameSessionState.ENDED, gameSession.getState());
        assertNull(gameSession.getWorld().match().winnerPlayerId());
        verify(gameResultRepository).save(any());
        verify(eventPublisher).publishEvent(any(OnlineGameplayEvent.class));
    }
}
