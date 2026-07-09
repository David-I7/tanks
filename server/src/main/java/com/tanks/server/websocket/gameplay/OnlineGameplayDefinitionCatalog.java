package com.tanks.server.websocket.gameplay;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

@Service
public class OnlineGameplayDefinitionCatalog {

    private static final OnlineGameplayDefinitions CURRENT = new OnlineGameplayDefinitions(
            "online-gameplay-definitions.v1",
            Map.of(
                    "vanguard", new OnlineTankDefinition(
                            "vanguard",
                            "Vanguard",
                            "tank.vanguard",
                            110,
                            100,
                            standardLoadout()),
                    "specter", new OnlineTankDefinition(
                            "specter",
                            "Specter",
                            "tank.specter",
                            94,
                            100,
                            standardLoadout())),
            Map.of(
                    "basicShell", new OnlineProjectileDefinition(
                            "basicShell",
                            "Basic Shell",
                            "projectile.basic-shell",
                            new OnlineProjectilePhysics(4, 1, 0, 1),
                            new OnlineTerrainEffect.Crater(46),
                            new OnlineDamageEffect.Radial(46, 48),
                            "impact.orange-pop",
                            0.42),
                    "mortar", new OnlineProjectileDefinition(
                            "mortar",
                            "Mortar",
                            "projectile.mortar",
                            new OnlineProjectilePhysics(5, 1.36, 0.02, 0.78),
                            new OnlineTerrainEffect.Crater(64),
                            new OnlineDamageEffect.Radial(62, 38),
                            "impact.smoke-ring",
                            0.58),
                    "heavyShell", new OnlineProjectileDefinition(
                            "heavyShell",
                            "Heavy Shell",
                            "projectile.heavy-shell",
                            new OnlineProjectilePhysics(7, 1.14, 0.01, 0.92),
                            new OnlineTerrainEffect.Drill(38, 42),
                            new OnlineDamageEffect.Focused(34, 72),
                            "impact.red-slam",
                            0.5),
                    "cluster", new OnlineProjectileDefinition(
                            "cluster",
                            "Cluster",
                            "projectile.cluster",
                            new OnlineProjectilePhysics(3, 0.92, 0.035, 1.12),
                            new OnlineTerrainEffect.Crater(30),
                            new OnlineDamageEffect.Radial(78, 30),
                            "impact.spark-burst",
                            0.48),
                    "needle", new OnlineProjectileDefinition(
                            "needle",
                            "Needle",
                            "projectile.needle",
                            new OnlineProjectilePhysics(2, 0.8, 0, 1.35),
                            new OnlineTerrainEffect.Drill(16, 56),
                            new OnlineDamageEffect.Focused(22, 58),
                            "impact.blue-flash",
                            0.36)),
            new OnlineValidationRules(120, 0, 1, -90, 90));

    public OnlineGameplayDefinitions current() {
        return CURRENT;
    }

    private static List<OnlineProjectileSlotDefinition> standardLoadout() {
        return List.of(
                new OnlineProjectileSlotDefinition("standard", "basicShell", "Std", "projectile-slot.standard"),
                new OnlineProjectileSlotDefinition("mortar", "mortar", "Mtr", "projectile-slot.mortar"),
                new OnlineProjectileSlotDefinition("heavy", "heavyShell", "Hvy", "projectile-slot.heavy"),
                new OnlineProjectileSlotDefinition("cluster", "cluster", "Clu", "projectile-slot.cluster"),
                new OnlineProjectileSlotDefinition("needle", "needle", "Ndl", "projectile-slot.needle"));
    }
}
