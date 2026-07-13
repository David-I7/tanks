package com.tanks.server.websocket.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.context.ApplicationEventPublisher;
import com.tanks.server.repositories.*;
import com.tanks.server.websocket.dto.gameplay.*;
import com.tanks.server.websocket.entities.gameSession.*;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.gameplay.simulation.GameStateResponseFactory;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.simulation.DefaultGameSimulation;
import com.tanks.server.websocket.gameplay.world.InitialWorldFactory;
import com.tanks.server.websocket.repositories.*;

class GameSessionServiceAuthoritativeGameplayTest {
    @Test void directionOnlyMovementMutatesWorldAndPublishesAuthoritativePath() {
        Harness harness = new Harness();
        GameSession session = harness.startedSession(42);
        var tank = session.getWorld().requireTankByPlayer(1);
        double fromX = tank.position().x();
        when(harness.gameRepository.findById(session.getId())).thenReturn(Optional.of(session));

        boolean accepted = harness.service.acceptPlayerIntent("host", session.getId(),
                new OnlinePlayerIntentRequestDto<>(OnlineGameplayProtocolVersion.V1, session.getId().toString(), 1,
                        "move", 1, 0, OnlinePlayerIntentRequestType.MOVE,
                        new OnlinePlayerIntentRequestPayloads.Move(1)));

        assertThat(accepted).isTrue();
        var movement = (OnlineDiffResponsePayloads.MovementSegment) harness.diffs().getFirst().payload();
        assertThat(movement.movementPath()).hasSizeGreaterThan(1);
        assertThat(movement.to()).isEqualTo(tank.position());
        assertThat(movement.to().x()).isGreaterThan(fromX);
        assertThat(movement.fuelAfter()).isLessThan(movement.fuelBefore());
    }

    @Test void resyncReturnsCurrentMutatedTerrainWorldAndGameContent() {
        Harness harness = new Harness();
        GameSession session = harness.startedSession(99);
        session.getTerrainModel().deform(200, 400,
                harness.contentCatalog.current().requireProjectile("basicShell").terrainEffect());
        session.getWorld().requireTankByPlayer(1).fuel(37);
        session.setNextDiffSequence(8);
        when(harness.gameRepository.findById(session.getId())).thenReturn(Optional.of(session));

        assertThat(harness.service.sendResyncStateToPlayer(session.getId(), "host",
                OnlineDiffResponsePayloads.ResyncReason.RECONNECT)).isTrue();

        var payload = (OnlineDiffResponsePayloads.ResyncState) harness.diffs().getFirst().payload();
        assertThat(payload.state().gameContentVersion()).isEqualTo("game-content.v1");
        assertThat(payload.state().gameContent()).isNotNull();
        assertThat(((OnlineTerrainSnapshotResponseDto.Heightmap) payload.state().terrain()).surface())
                .isEqualTo(session.getTerrainModel().surface());
        assertThat(payload.state().tanks().getFirst().fuel()).isEqualTo(37);
    }

    @Test @DisplayName("golden projectile mutation and settlement are returned exactly by reconnect resync")
    void projectileMutationAndSettlementAreTheStateReturnedByReconnect() {
        Harness harness = new Harness();
        GameSession session = harness.startedSession(123);
        var before = session.getTerrainModel().surface();
        when(harness.gameRepository.findById(session.getId())).thenReturn(Optional.of(session));
        boolean accepted = harness.service.acceptPlayerIntent("host", session.getId(),
                new OnlinePlayerIntentRequestDto<>(OnlineGameplayProtocolVersion.V1, session.getId().toString(), 1,
                        "fire", 1, 0, OnlinePlayerIntentRequestType.FIRE,
                        new OnlinePlayerIntentRequestPayloads.Fire(45, .5, "standard")));
        assertThat(accepted).isTrue();
        assertThat(session.getTerrainModel().surface()).isNotEqualTo(before);
        assertThat(harness.diffs()).extracting(OnlineDiffResponseDto::type)
                .contains(OnlineStateDiffResponseType.PROJECTILE_RESOLUTION, OnlineStateDiffResponseType.TERRAIN_PATCH);

        harness.events.clear();
        assertThat(harness.service.sendResyncStateToPlayer(session.getId(), "host",
                OnlineDiffResponsePayloads.ResyncReason.RECONNECT)).isTrue();
        var recovered = (OnlineDiffResponsePayloads.ResyncState) harness.diffs().getFirst().payload();
        assertThat(recovered.state()).isEqualTo(harness.stateFactory.createStateSnapshot(session));
        assertThat(((OnlineTerrainSnapshotResponseDto.Heightmap) recovered.state().terrain()).surface())
                .isEqualTo(session.getTerrainModel().surface());
        assertThat(recovered.state().tanks()).extracting(OnlineTankSnapshotResponseDto::position)
                .containsExactlyElementsOf(session.getWorld().tanks().values().stream().map(tank -> tank.position()).toList());
    }

    private static class Harness {
        final GameSessionRepository gameRepository = mock(GameSessionRepository.class);
        final UserSessionService userSessionService = mock(UserSessionService.class);
        final LobbyRepository lobbyRepository = mock(LobbyRepository.class);
        final QuickMatchService quickMatchService = mock(QuickMatchService.class);
        final List<Object> events = new ArrayList<>();
        final ApplicationEventPublisher publisher = events::add;
        final ClaimService claimService = mock(ClaimService.class);
        final GameResultRepository resultRepository = mock(GameResultRepository.class);
        final UserRepository userRepository = mock(UserRepository.class);
        final GameContentCatalog contentCatalog = new GameContentCatalog();
        final InitialWorldFactory worldFactory = new InitialWorldFactory();
        final GameStateResponseFactory stateFactory = new GameStateResponseFactory(contentCatalog);
        final GameSessionService service = new GameSessionService(gameRepository, userSessionService, lobbyRepository,
                quickMatchService, publisher, claimService, contentCatalog, worldFactory, new DefaultGameSimulation(),
                stateFactory, resultRepository, userRepository);

        Harness() { when(gameRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0)); }

        GameSession startedSession(long seed) {
            var initial = worldFactory.create(contentCatalog.current(), seed, "host", "opponent");
            return GameSession.builder().id(UUID.randomUUID()).playerA("host").playerB("opponent")
                    .state(GameSessionState.STARTED).serverTick(0).nextDiffSequence(2)
                    .lastDiffServerTick(0)
                    .gameContentVersion(contentCatalog.current().version()).generationSeed(seed)
                    .world(initial.world()).terrainModel(initial.terrainModel()).build();
        }

        List<OnlineDiffResponseDto<?>> diffs() {
            return events.stream().filter(OnlineGameplayEvent.class::isInstance).map(OnlineGameplayEvent.class::cast)
                    .map(OnlineGameplayEvent::getPayload).toList();
        }
    }
}
