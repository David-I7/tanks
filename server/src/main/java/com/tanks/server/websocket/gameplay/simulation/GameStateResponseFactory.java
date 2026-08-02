package com.tanks.server.websocket.gameplay.simulation;

import java.util.List;
import org.springframework.stereotype.Service;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponseDto;
import com.tanks.server.websocket.dto.gameplay.OnlineGameplayProtocolVersion;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineStateDiffResponseType;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.ResyncReason;
import com.tanks.server.websocket.dto.gameplay.diffResponse.states.InitialState;
import com.tanks.server.websocket.dto.gameplay.diffResponse.states.ResyncState;
import com.tanks.server.websocket.dto.gameplay.gameContent.GameContentResponseDto;
import com.tanks.server.websocket.dto.gameplay.match.OnlineMatchSnapshotResponseDto;
import com.tanks.server.websocket.dto.gameplay.match.phases.MatchPhase;
import com.tanks.server.websocket.dto.gameplay.snapshots.*;
import com.tanks.server.websocket.dto.gameplay.terrain.snapshot.Heightmap;
import com.tanks.server.websocket.dto.gameplay.terrain.snapshot.TerrainSnapshotKind;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.gameplay.content.GameContent;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.content.definitions.TankDefinition;
import com.tanks.server.websocket.gameplay.world.TankState;

@Service
public class GameStateResponseFactory {
    private final GameContentCatalog contentCatalog;

    public GameStateResponseFactory(GameContentCatalog contentCatalog) { this.contentCatalog = contentCatalog; }

    public OnlineDiffResponseDto createForPlayer(GameSession session, long localPlayerId) {
        return OnlineDiffResponseDto.builder()
                .protocolVersion(OnlineGameplayProtocolVersion.V1)
                .gameSessionId(session.getId().toString())
                .sequence(1)
                .serverTick(0)
                .type(OnlineStateDiffResponseType.INITIAL_STATE)
                .intentId(null)
                .payload(InitialState.builder()
                        .expectedNextDiffSequence(2)
                        .localPlayerId(localPlayerId)
                        .state(createStateSnapshot(session))
                        .build())
                .build();
    }

    public OnlineDiffResponseDto createResyncForPlayer(GameSession session,
            ResyncReason reason, long localPlayerId) {
        long replaces = Math.max(1, session.getNextDiffSequence() - 1);
        return OnlineDiffResponseDto.builder()
                .protocolVersion(OnlineGameplayProtocolVersion.V1)
                .gameSessionId(session.getId().toString())
                .sequence(replaces)
                .serverTick(session.getLastDiffServerTick())
                .type(OnlineStateDiffResponseType.RESYNC_STATE)
                .intentId(null)
                .payload(ResyncState.builder()
                        .replacesSequence(replaces)
                        .reason(reason)
                        .localPlayerId(localPlayerId)
                        .state(createStateSnapshot(session))
                        .build())
                .build();
    }

    public OnlineGameStateSnapshotResponseDto createStateSnapshot(GameSession session) {
        GameContent content = contentCatalog.require(session.getGameContentVersion());
        if (session.getWorld() == null || session.getTerrainModel() == null) {
            throw new IllegalStateException("Game Session has no authoritative World");
        }
        return OnlineGameStateSnapshotResponseDto.builder()
                .gameContentVersion(content.version())
                .gameContent(GameContentResponseDto.from(content))
                .match(OnlineMatchSnapshotResponseDto.builder()
                        .phase(matchPhase(session))
                        .activePlayerId(activePlayerId(session))
                        .playerCount(2)
                        .turnNumber(session.getWorld().match().turnNumber())
                        .turnTimeRemainingTicks(Math.max(0, session.getWorld().match().turnEndsAtServerTick() - session.getServerTick()))
                        .winnerPlayerId(winnerPlayerId(session))
                        .matchEndsAtServerTick(session.getMatchEndsAtServerTick())
                        .wind(session.getWorld().match().wind())
                        .build())
                .terrain(new Heightmap(TerrainSnapshotKind.HEIGHTMAP,
                        session.getTerrainModel().width(), session.getTerrainModel().height(), session.getTerrainModel().surface()))
                .tanks(session.getWorld().tanks().values().stream()
                        .sorted(java.util.Comparator.comparingLong(TankState::playerId))
                        .map(tank -> tankSnapshot(content, tank)).toList())
                .projectiles(session.getWorld().projectiles().values().stream()
                        .sorted(java.util.Comparator.comparingLong(com.tanks.server.websocket.gameplay.world.ProjectileState::entityId))
                        .map(projectile -> {
                    var definition = content.requireProjectile(projectile.definitionId());
                    return new OnlineProjectileSnapshotResponseDto(projectile.entityId(), projectile.ownerPlayerId(),
                            definition.id(), projectile.position(), projectile.velocity());
                }).toList())
                .lootCrates(session.getWorld().lootCrates() != null ? session.getWorld().lootCrates().stream()
                        .map(crate -> new OnlineLootCrateSnapshotResponseDto(
                                crate.crateId(),
                                crate.crateType(),
                                crate.x(),
                                crate.y(),
                                crate.targetY(),
                                crate.isLanding(),
                                crate.collected(),
                                crate.value()))
                        .toList() : List.of())
                .build();
    }

    private static OnlineTankSnapshotResponseDto tankSnapshot(GameContent content, TankState state) {
        TankDefinition definition = content.requireTank(state.definitionId());
        return OnlineTankSnapshotResponseDto.builder()
                .entityId(state.entityId())
                .playerId(state.playerId())
                .displayName(state.displayName())
                .tankDefinitionId(definition.id())
                .width(definition.width())
                .height(definition.height())
                .visual(definition.visual())
                .position(state.position())
                .facing(state.facing())
                .aimAngle(state.aimAngle())
                .power(state.power())
                .selectedProjectileSlotId(state.selectedProjectileSlotId())
                .loadout(definition.loadout())
                .health(state.health())
                .maxHealth(definition.maxHealth())
                .fuel(state.fuel())
                .alive(state.alive())
                .build();
    }

    private static MatchPhase matchPhase(GameSession session) {
        return GameSessionState.ENDED.equals(session.getState())
                ? MatchPhase.GAME_OVER : MatchPhase.AIMING;
    }
    private static long activePlayerId(GameSession session) {
        return session.getWorld().match().activePlayerId();
    }
    private static Long winnerPlayerId(GameSession session) {
        if (!GameSessionState.ENDED.equals(session.getState())) return null;
        boolean a = session.getWorld().requireTankByPlayer(1).alive();
        boolean b = session.getWorld().requireTankByPlayer(2).alive();
        return session.getWorld().match().winnerPlayerId() != null
                ? session.getWorld().match().winnerPlayerId() : a == b ? null : a ? 1L : 2L;
    }
}
