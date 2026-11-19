package com.tanks.server.websocket.dto.gameplay.gameContent.definitions;

import com.tanks.server.websocket.gameplay.content.damage.DamageEffect;
import com.tanks.server.websocket.gameplay.content.definitions.DamageTrailConfig;
import com.tanks.server.websocket.gameplay.content.definitions.ProjectileDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.SubMunitionConfig;
import com.tanks.server.websocket.gameplay.content.terrain.TerrainEffect;

public record ProjectileDefinitionResponseDto(
        String id,
        String name,
        String description,
        String intendedUse,
        ProjectileVisual visual,
        double baseVelocity,
        double gravityScale,
        double drag,
        TerrainEffect terrainEffect,
        DamageEffect damageEffect,
        SubMunitionConfig subMunitions,
        DamageTrailConfig damageTrail) {

    public static ProjectileDefinitionResponseDto from(ProjectileDefinition value) {
        return new ProjectileDefinitionResponseDto(
                value.id(),
                value.name(),
                value.description(),
                value.intendedUse(),
                value.visual(),
                value.baseVelocity(),
                value.gravityScale(),
                value.drag(),
                value.terrainEffect(),
                value.damageEffect(),
                value.subMunitions(),
                value.damageTrail());
    }
}
