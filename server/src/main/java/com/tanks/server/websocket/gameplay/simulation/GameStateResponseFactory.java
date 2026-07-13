package com.tanks.server.websocket.gameplay.simulation;

import java.util.List;
import org.springframework.stereotype.Service;
import com.tanks.server.websocket.dto.gameplay.*;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.gameplay.content.*;
import com.tanks.server.websocket.gameplay.world.TankState;

@Service
public class GameStateResponseFactory {
    private final GameContentCatalog contentCatalog;

    public GameStateResponseFactory(GameContentCatalog contentCatalog) { this.contentCatalog = contentCatalog; }

    public OnlineDiffResponseDto<OnlineDiffResponsePayloads.InitialState> createForPlayer(GameSession session, long localPlayerId) {
        return new OnlineDiffResponseDto<>(OnlineGameplayProtocolVersion.V1, session.getId().toString(), 1, 0,
                OnlineStateDiffResponseType.INITIAL_STATE, null,
                new OnlineDiffResponsePayloads.InitialState(2, localPlayerId, createStateSnapshot(session)));
    }

    public OnlineDiffResponseDto<OnlineDiffResponsePayloads.ResyncState> createResyncForPlayer(GameSession session,
            OnlineDiffResponsePayloads.ResyncReason reason, long localPlayerId) {
        long replaces = Math.max(1, session.getNextDiffSequence() - 1);
        return new OnlineDiffResponseDto<>(OnlineGameplayProtocolVersion.V1, session.getId().toString(), replaces,
                session.getLastDiffServerTick(), OnlineStateDiffResponseType.RESYNC_STATE, null,
                new OnlineDiffResponsePayloads.ResyncState(replaces, reason, localPlayerId, createStateSnapshot(session)));
    }

    public OnlineGameStateSnapshotResponseDto createStateSnapshot(GameSession session) {
        GameContent content = contentCatalog.require(session.getGameContentVersion());
        if (session.getWorld() == null || session.getTerrainModel() == null) {
            throw new IllegalStateException("Game Session has no authoritative World");
        }
        return new OnlineGameStateSnapshotResponseDto(content.version(), GameContentResponseDto.from(content),
                new OnlineMatchSnapshotResponseDto(matchPhase(session), activePlayerId(session), 2,
                        session.getWorld().match().turnNumber(),
                        Math.max(0, session.getWorld().match().turnEndsAtServerTick() - session.getServerTick()),
                        winnerPlayerId(session)),
                new OnlineTerrainSnapshotResponseDto.Heightmap(OnlineTerrainSnapshotResponseDto.TerrainSnapshotKind.HEIGHTMAP,
                        session.getTerrainModel().width(), session.getTerrainModel().height(), session.getTerrainModel().surface()),
                session.getWorld().tanks().values().stream().map(tank -> tankSnapshot(content, tank)).toList(),
                session.getWorld().projectiles().values().stream().map(projectile -> {
                    var definition = content.requireProjectile(projectile.definitionId());
                    return new OnlineProjectileSnapshotResponseDto(projectile.entityId(), projectile.ownerPlayerId(),
                            definition.id(), definition.renderAssetId(), projectile.position(), projectile.velocity());
                }).toList());
    }

    private static OnlineTankSnapshotResponseDto tankSnapshot(GameContent content, TankState state) {
        TankDefinition definition = content.requireTank(state.definitionId());
        return new OnlineTankSnapshotResponseDto(state.entityId(), state.playerId(), state.displayName(), definition.id(),
                definition.renderAssetId(), state.position(), state.facing(), state.aimAngle(), state.power(),
                state.selectedProjectileSlotId(), definition.loadout().stream().map(slot -> new OnlineProjectileSlotSnapshotResponseDto(
                        slot.id(), slot.projectileDefinitionId(), slot.label(), slot.renderAssetId())).toList(),
                state.health(), definition.maxHealth(), state.fuel(), state.alive());
    }

    private static OnlineMatchSnapshotResponseDto.MatchPhase matchPhase(GameSession session) {
        return GameSessionState.ENDED.equals(session.getState())
                ? OnlineMatchSnapshotResponseDto.MatchPhase.GAME_OVER : OnlineMatchSnapshotResponseDto.MatchPhase.AIMING;
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
