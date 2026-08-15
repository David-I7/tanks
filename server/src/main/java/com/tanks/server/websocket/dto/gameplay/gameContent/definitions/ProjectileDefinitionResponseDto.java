package com.tanks.server.websocket.dto.gameplay.gameContent.definitions;

import com.tanks.server.websocket.gameplay.content.damage.Focused;
import com.tanks.server.websocket.gameplay.content.damage.Radial;
import com.tanks.server.websocket.gameplay.content.definitions.ProjectileDefinition;
import com.tanks.server.websocket.gameplay.content.terrain.Crater;
import com.tanks.server.websocket.gameplay.content.terrain.Drill;

public record ProjectileDefinitionResponseDto(
        String id,
        String name,
        String label,
        double radius,
        double baseVelocity,
        double gravityScale,
        double drag,
        String terrainEffectType,
        double terrainRadius,
        double terrainDepth,
        String damageEffectType,
        double damageRadius,
        double damage) {

    public static ProjectileDefinitionResponseDto from(ProjectileDefinition value) {
        double terrainRadius = value.terrainEffect() instanceof Crater crater ? crater.radius() : ((Drill) value.terrainEffect()).radius();
        double terrainDepth = value.terrainEffect() instanceof Drill drill ? drill.depth() : 0;
        return new ProjectileDefinitionResponseDto(
                value.id(),
                value.name(),
                value.label(),
                value.radius(),
                value.baseVelocity(),
                value.gravityScale(),
                value.drag(),
                value.terrainEffect() instanceof Crater ? "CRATER" : "DRILL",
                terrainRadius,
                terrainDepth,
                value.damageEffect() instanceof Radial ? "RADIAL" : "FOCUSED",
                value.damageEffect().radius(),
                value.damageEffect().damage());
    }
}
