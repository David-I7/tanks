package com.tanks.server.websocket.dto.gameplay;

import java.util.List;
import java.util.Map;
import com.tanks.server.websocket.gameplay.content.*;

public record GameContentResponseDto(
        String version,
        WorldDefinitionResponseDto world,
        Map<String, TankDefinitionResponseDto> tanks,
        Map<String, ProjectileDefinitionResponseDto> projectiles) {

    public static GameContentResponseDto from(GameContent content) {
        return new GameContentResponseDto(content.version(), WorldDefinitionResponseDto.from(content.world()),
                content.tanks().entrySet().stream().collect(java.util.stream.Collectors.toUnmodifiableMap(
                        Map.Entry::getKey, entry -> TankDefinitionResponseDto.from(entry.getValue()))),
                content.projectiles().entrySet().stream().collect(java.util.stream.Collectors.toUnmodifiableMap(
                        Map.Entry::getKey, entry -> ProjectileDefinitionResponseDto.from(entry.getValue()))));
    }

    public record SpawnRegionResponseDto(int minX, int maxX) {}
    public record WorldDefinitionResponseDto(int width, int height, int bedrockDepth, int tickRateHz,
            double gravity, double projectileTimeStepSeconds, int maxProjectileSteps,
            long movementSegmentDurationTicks, SpawnRegionResponseDto playerASpawnRegion,
            SpawnRegionResponseDto playerBSpawnRegion) {
        static WorldDefinitionResponseDto from(WorldDefinition value) {
            return new WorldDefinitionResponseDto(value.width(), value.height(), value.bedrockDepth(), value.tickRateHz(),
                    value.gravity(), value.projectileTimeStepSeconds(), value.maxProjectileSteps(),
                    value.movementSegmentDurationTicks(), region(value.playerASpawnRegion()), region(value.playerBSpawnRegion()));
        }
        private static SpawnRegionResponseDto region(SpawnRegion value) { return new SpawnRegionResponseDto(value.minX(), value.maxX()); }
    }
    public record ProjectileSlotDefinitionResponseDto(String id, String projectileDefinitionId, String label, String renderAssetId) {}
    public record TankDefinitionResponseDto(String id, String name, String renderAssetId, int maxHealth, int maxFuel,
            int movementQuantum, int fuelRate, int climbCapability, double collisionRadius, int halfWidth,
            double trackGroundOffset, double muzzleForwardOffset, double muzzleVerticalOffset,
            List<ProjectileSlotDefinitionResponseDto> loadout) {
        static TankDefinitionResponseDto from(TankDefinition value) {
            return new TankDefinitionResponseDto(value.id(), value.name(), value.renderAssetId(), value.maxHealth(),
                    value.maxFuel(), value.movementQuantum(), value.fuelRate(), value.climbCapability(),
                    value.collisionRadius(), value.halfWidth(), value.trackGroundOffset(), value.muzzleForwardOffset(),
                    value.muzzleVerticalOffset(), value.loadout().stream().map(slot -> new ProjectileSlotDefinitionResponseDto(
                            slot.id(), slot.projectileDefinitionId(), slot.label(), slot.renderAssetId())).toList());
        }
    }
    public record ProjectileDefinitionResponseDto(String id, String name, String renderAssetId, double radius,
            double baseVelocity, double gravityScale, double drag, double muzzleVelocityScale,
            String terrainEffectType, double terrainRadius, double terrainDepth,
            String damageEffectType, double damageRadius, double damage,
            String impactRenderAssetId, double impactDuration) {
        static ProjectileDefinitionResponseDto from(ProjectileDefinition value) {
            double terrainRadius = value.terrainEffect() instanceof TerrainEffect.Crater crater ? crater.radius() : ((TerrainEffect.Drill) value.terrainEffect()).radius();
            double terrainDepth = value.terrainEffect() instanceof TerrainEffect.Drill drill ? drill.depth() : 0;
            return new ProjectileDefinitionResponseDto(value.id(), value.name(), value.renderAssetId(), value.radius(),
                    value.baseVelocity(), value.gravityScale(), value.drag(), value.muzzleVelocityScale(),
                    value.terrainEffect() instanceof TerrainEffect.Crater ? "CRATER" : "DRILL", terrainRadius, terrainDepth,
                    value.damageEffect() instanceof DamageEffect.Radial ? "RADIAL" : "FOCUSED",
                    value.damageEffect().radius(), value.damageEffect().damage(), value.impactRenderAssetId(), value.impactDuration());
        }
    }
}
