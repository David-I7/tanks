package com.tanks.server.websocket.gameplay;

import java.util.List;

import org.springframework.stereotype.Service;

import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineIntentPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineProjectileSnapshotDto;
import com.tanks.server.websocket.dto.gameplay.OnlineTankSnapshotDto;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;

@Service
public class OnlineGameplayRules {

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
                tank.maxHealth(),
                tank.maxHealth(),
                tank.maxFuel(),
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
            long projectileEntityId,
            long ownerPlayerId,
            String projectileDefinitionId,
            OnlineVec2Dto launch,
            OnlineVec2Dto impact) {
        OnlineProjectileDefinition projectile = requireProjectile(projectileDefinitionId);

        return new OnlineDiffPayloads.ProjectileResolution(
                projectileEntityId,
                ownerPlayerId,
                projectile.id(),
                projectile.renderAssetId(),
                projectile.impactRenderAssetId(),
                launch,
                impact,
                List.of());
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
