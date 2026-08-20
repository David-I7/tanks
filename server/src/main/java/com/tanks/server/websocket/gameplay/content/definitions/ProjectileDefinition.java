package com.tanks.server.websocket.gameplay.content.definitions;

import com.tanks.server.websocket.gameplay.content.damage.DamageEffect;
import com.tanks.server.websocket.gameplay.content.terrain.TerrainEffect;

public record ProjectileDefinition(
        String id,
        String name,
        String description,
        String intendedUse,
        ProjectileVisual visual,
        double baseVelocity,
        double gravityScale,
        Integer initialAmmo,
        TerrainEffect terrainEffect,
        DamageEffect damageEffect,
        SubMunitionConfig subMunitions,
        DamageTrailConfig damageTrail,
        SalvoConfig salvo,
        ApexSplitConfig apexSplit,
        BouncerConfig bouncer) {

    public ProjectileDefinition(
            String id,
            String name,
            String description,
            String intendedUse,
            ProjectileVisual visual,
            double baseVelocity,
            double gravityScale,
            TerrainEffect terrainEffect,
            DamageEffect damageEffect,
            SubMunitionConfig subMunitions,
            DamageTrailConfig damageTrail,
            SalvoConfig salvo,
            ApexSplitConfig apexSplit,
            BouncerConfig bouncer) {
        this(id, name, description, intendedUse, visual, baseVelocity, gravityScale, null, terrainEffect, damageEffect, subMunitions, damageTrail, salvo, apexSplit, bouncer);
    }

    public ProjectileDefinition(
            String id,
            String name,
            double baseVelocity,
            double gravityScale,
            TerrainEffect terrainEffect,
            DamageEffect damageEffect,
            SubMunitionConfig subMunitions,
            DamageTrailConfig damageTrail) {
        this(id, name, null, null, new ProjectileVisual(4.0, "#475569", "#38bdf8", "#f59e0b"), baseVelocity, gravityScale, null, terrainEffect, damageEffect, subMunitions, damageTrail, null, null, null);
    }

    public boolean isDefault() {
        return initialAmmo != null && initialAmmo == -1;
    }

    public double radius() {
        return visual != null ? visual.radius() : 4.0;
    }

    public ProjectileDefinition withId(String id) {
        return new ProjectileDefinition(
                id,
                name(),
                description(),
                intendedUse(),
                visual(),
                baseVelocity(),
                gravityScale(),
                initialAmmo(),
                terrainEffect(),
                damageEffect(),
                subMunitions(),
                damageTrail(),
                salvo(),
                apexSplit(),
                bouncer());
    }
}
