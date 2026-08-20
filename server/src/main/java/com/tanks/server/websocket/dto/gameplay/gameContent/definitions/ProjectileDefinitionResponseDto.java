package com.tanks.server.websocket.dto.gameplay.gameContent.definitions;

import com.tanks.server.websocket.gameplay.content.damage.Focused;
import com.tanks.server.websocket.gameplay.content.damage.Radial;
import com.tanks.server.websocket.gameplay.content.definitions.ApexSplitConfig;
import com.tanks.server.websocket.gameplay.content.definitions.BouncerConfig;
import com.tanks.server.websocket.gameplay.content.definitions.DamageTrailConfig;
import com.tanks.server.websocket.gameplay.content.definitions.ProjectileDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.ProjectileVisual;
import com.tanks.server.websocket.gameplay.content.definitions.SalvoConfig;
import com.tanks.server.websocket.gameplay.content.definitions.SubMunitionConfig;
import com.tanks.server.websocket.gameplay.content.terrain.Crater;
import com.tanks.server.websocket.gameplay.content.terrain.Drill;

public record ProjectileDefinitionResponseDto(
        String id,
        String name,
        String description,
        String intendedUse,
        ProjectileVisual visual,
        double baseVelocity,
        double gravityScale,
        Integer initialAmmo,
        String terrainEffectType,
        double terrainRadius,
        double terrainDepth,
        String damageEffectType,
        double damageRadius,
        double damage,
        SubMunitionConfig subMunitions,
        DamageTrailConfig damageTrail,
        SalvoConfig salvo,
        ApexSplitConfig apexSplit,
        BouncerConfig bouncer) {

    public static ProjectileDefinitionResponseDto from(ProjectileDefinition value) {
        double terrainRadius = value.terrainEffect() instanceof Crater crater ? crater.radius() : ((Drill) value.terrainEffect()).radius();
        double terrainDepth = value.terrainEffect() instanceof Drill drill ? drill.depth() : 0;
        return new ProjectileDefinitionResponseDto(
                value.id(),
                value.name(),
                value.description(),
                value.intendedUse(),
                value.visual(),
                value.baseVelocity(),
                value.gravityScale(),
                value.initialAmmo(),
                value.terrainEffect() instanceof Crater ? "CRATER" : "DRILL",
                terrainRadius,
                terrainDepth,
                value.damageEffect() instanceof Radial ? "RADIAL" : "FOCUSED",
                value.damageEffect().radius(),
                value.damageEffect().damage(),
                value.subMunitions(),
                value.damageTrail(),
                value.salvo(),
                value.apexSplit(),
                value.bouncer());
    }
}
