package com.tanks.server.websocket.gameplay;

import java.util.List;

import org.springframework.stereotype.Service;

import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineIntentPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineProjectileSlotSnapshotDto;
import com.tanks.server.websocket.dto.gameplay.OnlineProjectileSnapshotDto;
import com.tanks.server.websocket.dto.gameplay.OnlineTankSnapshotDto;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;

@Service
public class OnlineGameplayRules {

    public static final double WORLD_MIN_X = 0;
    public static final double WORLD_MAX_X = 960;
    public static final long MOVEMENT_SEGMENT_DURATION_TICKS = 6;
    public static final double PLAYER_A_INITIAL_TANK_X = 160;
    public static final double PLAYER_A_INITIAL_TANK_Y = 420;
    public static final double PLAYER_B_INITIAL_TANK_X = 800;
    public static final double PLAYER_B_INITIAL_TANK_Y = 420;
    public static final double INITIAL_TANK_FUEL = 100;

    private final OnlineGameplayDefinitionCatalog gameplayDefinitionCatalog;

    public OnlineGameplayRules(OnlineGameplayDefinitionCatalog gameplayDefinitionCatalog) {
        this.gameplayDefinitionCatalog = gameplayDefinitionCatalog;
    }

    public String currentVersion() {
        return definitions().version();
    }

    public OnlineTankSnapshotDto createTankSnapshot(
            long entityId,
            long playerId,
            String displayName,
            String tankDefinitionId,
            OnlineVec2Dto position,
            int facing) {
        OnlineTankDefinition tank = requireTank(tankDefinitionId);
        return createTankSnapshot(entityId, playerId, displayName, tankDefinitionId, position, facing, tank.maxFuel());
    }

    public OnlineTankSnapshotDto createTankSnapshot(
            long entityId,
            long playerId,
            String displayName,
            String tankDefinitionId,
            OnlineVec2Dto position,
            int facing,
            double fuel) {
        OnlineTankDefinition tank = requireTank(tankDefinitionId);
        OnlineProjectileSlotDefinition selectedSlot = tank.loadout().getFirst();

        return new OnlineTankSnapshotDto(
                entityId,
                playerId,
                displayName,
                tank.id(),
                tank.renderAssetId(),
                position,
                facing,
                45,
                0.5,
                selectedSlot.id(),
                tank.loadout().stream()
                        .map(slot -> new OnlineProjectileSlotSnapshotDto(
                                slot.id(),
                                slot.projectileDefinitionId(),
                                slot.label(),
                                slot.renderAssetId()))
                        .toList(),
                tank.maxHealth(),
                tank.maxHealth(),
                fuel,
                true);
    }

    public OnlineProjectileSnapshotDto createProjectileSnapshot(
            long entityId,
            long ownerPlayerId,
            String projectileDefinitionId,
            OnlineVec2Dto position,
            OnlineVec2Dto velocity) {
        OnlineProjectileDefinition projectile = requireProjectile(projectileDefinitionId);

        return new OnlineProjectileSnapshotDto(
                entityId,
                ownerPlayerId,
                projectile.id(),
                projectile.renderAssetId(),
                position,
                velocity);
    }

    public OnlineDiffPayloads.ProjectileResolution createProjectileResolution(
            String intentId,
            long projectileEntityId,
            long ownerPlayerId,
            String projectileDefinitionId,
            OnlineVec2Dto launch,
            OnlineVec2Dto impact) {
        OnlineProjectileDefinition projectile = requireProjectile(projectileDefinitionId);

        return new OnlineDiffPayloads.ProjectileResolution(
                intentId,
                projectileEntityId,
                ownerPlayerId,
                projectile.id(),
                projectile.renderAssetId(),
                projectile.impactRenderAssetId(),
                launch,
                impact,
                List.of());
    }

    public OnlineDiffPayloads.MovementSegment createMovementSegment(
            String intentId,
            long playerId,
            long tankEntityId,
            OnlineVec2Dto from,
            OnlineIntentPayloads.Move move,
            double fuelBefore,
            long startedServerTick) {
        double distance = Math.abs(move.direction());
        double nextX = from.x() + move.direction();
        double fuelAfter = fuelBefore - distance;
        return new OnlineDiffPayloads.MovementSegment(
                intentId,
                playerId,
                tankEntityId,
                from,
                new OnlineVec2Dto(nextX, from.y()),
                fuelBefore,
                fuelAfter,
                distance,
                startedServerTick,
                startedServerTick + MOVEMENT_SEGMENT_DURATION_TICKS,
                MOVEMENT_SEGMENT_DURATION_TICKS);
    }

    public OnlineTerrainEffect terrainEffect(String projectileDefinitionId) {
        return requireProjectile(projectileDefinitionId).terrainEffect();
    }

    public OnlineDamageEffect damageEffect(String projectileDefinitionId) {
        return requireProjectile(projectileDefinitionId).damageEffect();
    }

    public boolean acceptsFireIntent(OnlineIntentPayloads.Fire fire) {
        OnlineValidationRules validation = definitions().validation();
        boolean powerInBounds = fire.power() >= validation.minFirePower()
                && fire.power() <= validation.maxFirePower();
        boolean angleInBounds = fire.angle() >= validation.minAimAngle()
                && fire.angle() <= validation.maxAimAngle();

        return powerInBounds && angleInBounds && hasProjectileSlot(fire.projectileSlotId());
    }

    public boolean acceptsMoveIntent(OnlineIntentPayloads.Move move) {
        OnlineValidationRules validation = definitions().validation();
        return move.direction() != 0
                && Math.abs(move.direction()) <= validation.maxMoveIntentDistance();
    }

    public boolean hasFuelForMove(double fuel, OnlineIntentPayloads.Move move) {
        return fuel >= Math.abs(move.direction());
    }

    public boolean isMoveInBounds(OnlineVec2Dto from, OnlineIntentPayloads.Move move) {
        double nextX = from.x() + move.direction();
        return nextX >= WORLD_MIN_X && nextX <= WORLD_MAX_X;
    }

    private boolean hasProjectileSlot(String projectileSlotId) {
        return definitions().tanks().values().stream()
                .flatMap(tank -> tank.loadout().stream())
                .anyMatch(slot -> slot.id().equals(projectileSlotId));
    }

    private OnlineTankDefinition requireTank(String tankDefinitionId) {
        return definitions().tank(tankDefinitionId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown online tank definition: " + tankDefinitionId));
    }

    private OnlineProjectileDefinition requireProjectile(String projectileDefinitionId) {
        return definitions().projectile(projectileDefinitionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unknown online projectile definition: " + projectileDefinitionId));
    }

    private OnlineGameplayDefinitions definitions() {
        return gameplayDefinitionCatalog.current();
    }
}
