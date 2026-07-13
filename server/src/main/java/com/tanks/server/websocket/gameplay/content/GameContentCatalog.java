package com.tanks.server.websocket.gameplay.content;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GameContentCatalog {
    private static final List<ProjectileSlotDefinition> STANDARD_LOADOUT = List.of(
            new ProjectileSlotDefinition("standard", "basicShell", "Std", "projectile-slot.standard"),
            new ProjectileSlotDefinition("mortar", "mortar", "Mtr", "projectile-slot.mortar"),
            new ProjectileSlotDefinition("heavy", "heavyShell", "Hvy", "projectile-slot.heavy"),
            new ProjectileSlotDefinition("cluster", "cluster", "Clu", "projectile-slot.cluster"),
            new ProjectileSlotDefinition("needle", "needle", "Ndl", "projectile-slot.needle"));

    private static final GameContent CURRENT = new GameContent(
            "game-content.v1",
            new WorldDefinition(960, 560, 40, 30, 500, 1.0 / 30.0, 180, 6,
                    new SpawnRegion(96, 320), new SpawnRegion(640, 864)),
            Map.of(
                    "vanguard", tank("vanguard", "Vanguard", "tank.vanguard", 110),
                    "specter", tank("specter", "Specter", "tank.specter", 94)),
            Map.of(
                    "basicShell", projectile("basicShell", "Basic Shell", "projectile.basic-shell", 4, 1, 0, 1,
                            new TerrainEffect.Crater(46), new DamageEffect.Radial(46, 48), "impact.orange-pop", .42),
                    "mortar", projectile("mortar", "Mortar", "projectile.mortar", 5, 1.36, .02, .78,
                            new TerrainEffect.Crater(64), new DamageEffect.Radial(62, 38), "impact.smoke-ring", .58),
                    "heavyShell", projectile("heavyShell", "Heavy Shell", "projectile.heavy-shell", 7, 1.14, .01, .92,
                            new TerrainEffect.Drill(38, 42), new DamageEffect.Focused(34, 72), "impact.red-slam", .5),
                    "cluster", projectile("cluster", "Cluster", "projectile.cluster", 3, .92, .035, 1.12,
                            new TerrainEffect.Crater(30), new DamageEffect.Radial(78, 30), "impact.spark-burst", .48),
                    "needle", projectile("needle", "Needle", "projectile.needle", 2, .8, 0, 1.35,
                            new TerrainEffect.Drill(16, 56), new DamageEffect.Focused(22, 58), "impact.blue-flash", .36)),
            new ValidationRules(0, 1, -90, 90));
    private static final Map<String, GameContent> VERSIONS = Map.of(CURRENT.version(), CURRENT);

    public GameContent current() { return CURRENT; }

    public GameContent require(String version) {
        GameContent content = VERSIONS.get(version);
        if (content == null) throw new IllegalArgumentException("Unknown Game Content Version: " + version);
        return content;
    }

    private static TankDefinition tank(String id, String name, String asset, int health) {
        return new TankDefinition(id, name, asset, health, 100, 8, 1, 5, 32, 16, 0, 18, 24, STANDARD_LOADOUT);
    }

    private static ProjectileDefinition projectile(String id, String name, String asset, double radius,
            double gravityScale, double drag, double muzzleScale, TerrainEffect terrain, DamageEffect damage,
            String impactAsset, double impactDuration) {
        return new ProjectileDefinition(id, name, asset, radius, 1000, gravityScale, drag, muzzleScale,
                terrain, damage, impactAsset, impactDuration);
    }
}
