package com.tanks.server.websocket.gameplay.simulation;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.FireIntentIntentRequestPayload;
import com.tanks.server.websocket.gameplay.content.GameContent;
import com.tanks.server.websocket.gameplay.content.damage.Focused;
import com.tanks.server.websocket.gameplay.content.definitions.LootCrateConfig;
import com.tanks.server.websocket.gameplay.content.definitions.ProjectileDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.ProjectileVisual;
import com.tanks.server.websocket.gameplay.content.definitions.TankDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition;
import com.tanks.server.websocket.gameplay.content.terrain.Crater;
import com.tanks.server.websocket.gameplay.world.LootCrateState;
import com.tanks.server.websocket.gameplay.world.TankState;
import com.tanks.server.websocket.gameplay.world.TerrainModel;
import com.tanks.server.websocket.gameplay.world.World;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class DefaultGameSimulationTest {

    private static LootCrateConfig defaultCrates() {
        return new LootCrateConfig(25, 50, 1, 35.0, 150.0, List.of(120, 60, 30), 100.0, 3);
    }

    private static WorldDefinition defaultWorld() {
        return new WorldDefinition(
                List.of("forest"), 2400, 768, 30, 260.0, 400, 3L, null, null, 0.0, 0.0,
                30, 180, 0.55, defaultCrates()
        );
    }

    @Test
    void fireCalculatesVelocityUsingStandardRadiansWithoutFacingMultiplication() {
        DefaultGameSimulation simulation = new DefaultGameSimulation();

        TankDefinition tankDef = new TankDefinition(
                "cyber", "Cyber", 100, 200, 8, 1, 5, 32, 16, 28.0, -14.0, null, List.of("basicShell")
        );

        ProjectileDefinition projDef = new ProjectileDefinition(
                "basicShell", "Basic Shell", 600.0, 1.0,
                new Crater(30.0),
                new Focused(30.0, 50.0),
                null, null
        );

        WorldDefinition rules = defaultWorld();

        GameContent content = new GameContent(
                "v1.0", rules, null, Map.of("cyber", tankDef), Map.of("basicShell", projDef), null
        );

        List<Integer> surface = new ArrayList<>(Collections.nCopies(2400, 600));
        TerrainModel terrain = new TerrainModel(rules, surface);

        TankState tankRight = TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("cyber")
                .position(new OnlineVec2Dto(500, 400))
                .facing(1) // Facing right
                .aimAngle(-Math.PI / 4)
                .power(1.0)
                .selectedProjectileSlotId("basicShell")
                .health(100)
                .fuel(200)
                .weaponAmmo(Map.of("basicShell", -1))
                .build();

        TankState tankLeft = TankState.builder()
                .entityId(2L)
                .playerId(2L)
                .definitionId("cyber")
                .position(new OnlineVec2Dto(500, 400))
                .facing(-1) // Facing left
                .aimAngle(-Math.PI / 4)
                .power(1.0)
                .selectedProjectileSlotId("basicShell")
                .health(100)
                .fuel(200)
                .weaponAmmo(Map.of("basicShell", -1))
                .build();

        World worldRight = new World();
        worldRight.match().activePlayerId(1L);
        worldRight.tanks().put(1L, tankRight);

        World worldLeft = new World();
        worldLeft.match().activePlayerId(2L);
        worldLeft.tanks().put(2L, tankLeft);

        FireIntentIntentRequestPayload fireRightAim = new FireIntentIntentRequestPayload(-Math.PI / 4, 1.0);

        var resRightFacing = simulation.fire(content, worldRight, terrain, "intent-1", 100L, 1L, fireRightAim);
        var resLeftFacing = simulation.fire(content, worldLeft, terrain, "intent-2", 101L, 2L, fireRightAim);

        // First step after launch in trajectory must move right (+x) and up (-y) for BOTH facing directions
        assertTrue(resRightFacing.trajectory().get(1).x() > resRightFacing.launch().x(), "Facing 1: x should increase when aiming -PI/4");
        assertTrue(resRightFacing.trajectory().get(1).y() < resRightFacing.launch().y(), "Facing 1: y should decrease (upward) when aiming -PI/4");

        assertTrue(resLeftFacing.trajectory().get(1).x() > resLeftFacing.launch().x(), "Facing -1: x should increase when aiming -PI/4");
        assertTrue(resLeftFacing.trajectory().get(1).y() < resLeftFacing.launch().y(), "Facing -1: y should decrease (upward) when aiming -PI/4");
    }

    @Test
    void fireDecrementsLimitedAmmoOnTankState() {
        DefaultGameSimulation simulation = new DefaultGameSimulation();

        TankDefinition tankDef = new TankDefinition(
                "cyber", "Cyber", 100, 200, 8, 1, 5, 24, 24, 28.0, -14.0, null, List.of("basicShell", "cluster")
        );

        ProjectileDefinition projDef = new ProjectileDefinition(
                "cluster", "Cluster Bomb", 600.0, 1.0,
                new Crater(30.0),
                new Focused(30.0, 50.0),
                null, null
        );

        WorldDefinition rules = defaultWorld();

        GameContent content = new GameContent(
                "v1.0", rules, null, Map.of("cyber", tankDef), Map.of("cluster", projDef), null
        );

        List<Integer> surface = new ArrayList<>(Collections.nCopies(2400, 600));
        TerrainModel terrain = new TerrainModel(rules, surface);

        Map<String, Integer> ammo = new HashMap<>();
        ammo.put("basicShell", -1);
        ammo.put("cluster", 1);

        TankState tank = TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("cyber")
                .position(new OnlineVec2Dto(500, 400))
                .facing(1)
                .aimAngle(-Math.PI / 4)
                .power(1.0)
                .selectedProjectileSlotId("cluster")
                .weaponAmmo(ammo)
                .health(100)
                .fuel(200)
                .build();

        World world = new World();
        world.match().activePlayerId(1L);
        world.tanks().put(1L, tank);

        assertEquals(1, tank.weaponAmmo().get("cluster"));

        FireIntentIntentRequestPayload fireIntent = new FireIntentIntentRequestPayload(-Math.PI / 4, 1.0);
        simulation.fire(content, world, terrain, "intent-ammo", 200L, 1L, fireIntent);

        assertEquals(0, tank.weaponAmmo().get("cluster"));
    }

    @Test
    void checkLootCratePickupRefillsAmmo() {
        TankDefinition tankDef = new TankDefinition(
                "cyber", "Cyber", 100, 200, 8, 1, 5, 24, 24, 28.0, -14.0, null, List.of("basicShell", "cluster")
        );

        WorldDefinition rules = defaultWorld();

        GameContent content = new GameContent(
                "v1.0", rules, null, Map.of("cyber", tankDef), Map.of(), null
        );

        Map<String, Integer> ammo = new HashMap<>();
        ammo.put("basicShell", -1);
        ammo.put("cluster", 0);

        TankState tank = TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("cyber")
                .position(new OnlineVec2Dto(500, 400))
                .selectedProjectileSlotId("basicShell")
                .weaponAmmo(ammo)
                .health(100)
                .fuel(200)
                .build();

        World world = new World();
        world.tanks().put(1L, tank);
        var crate = new LootCrateState(
                "crate-1", "ammo", 505.0, 400.0, 400.0, false, false, 1
        );
        world.lootCrates().add(crate);

        DefaultGameSimulation.checkLootCratePickup(world, content, tank, tankDef, 500, 400);

        assertEquals(1, tank.weaponAmmo().get("cluster"));
        assertTrue(crate.collected());
        assertTrue(world.lootCrates().isEmpty());
    }

    @Test
    void fireThrowsWhenSelectedProjectileSlotIsNotInLoadout() {
        DefaultGameSimulation simulation = new DefaultGameSimulation();

        TankDefinition tankDef = new TankDefinition(
                "cyber", "Cyber", 100, 200, 8, 1, 5, 24, 24, 28.0, -14.0, null, List.of("basicShell")
        );
        WorldDefinition rules = defaultWorld();
        GameContent content = new GameContent(
                "v1.0", rules, null, Map.of("cyber", tankDef), Map.of(), null
        );

        List<Integer> surface = new ArrayList<>(Collections.nCopies(2400, 600));
        TerrainModel terrain = new TerrainModel(rules, surface);

        TankState tank = TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("cyber")
                .position(new OnlineVec2Dto(500, 400))
                .selectedProjectileSlotId("nonExistentSlot")
                .weaponAmmo(Map.of("basicShell", -1))
                .build();

        World world = new World();
        world.tanks().put(1L, tank);

        FireIntentIntentRequestPayload fireIntent = new FireIntentIntentRequestPayload(-Math.PI / 4, 1.0);
        assertThrows(IllegalStateException.class, () ->
                simulation.fire(content, world, terrain, "intent-invalid", 100L, 1L, fireIntent));
    }

    @Test
    void fireCalculatesDamageFromDamageEffectWithoutFallback() {
        DefaultGameSimulation simulation = new DefaultGameSimulation();

        TankDefinition tankDef = new TankDefinition(
                "cyber", "Cyber", 100, 200, 8, 1, 5, 24, 24, 28.0, -14.0, null, List.of("heavyShell")
        );
        ProjectileDefinition projDef = new ProjectileDefinition(
                "heavyShell", "Heavy Shell", 1.0, 1.0,
                new Crater(30.0),
                new Focused(30.0, 75.0),
                null, null
        );
        WorldDefinition rules = defaultWorld();
        GameContent content = new GameContent(
                "v1.0", rules, null, Map.of("cyber", tankDef), Map.of("heavyShell", projDef), null
        );

        List<Integer> surface = new ArrayList<>(Collections.nCopies(2400, 600));
        TerrainModel terrain = new TerrainModel(rules, surface);

        TankState shooter = TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("cyber")
                .position(new OnlineVec2Dto(500, 400))
                .selectedProjectileSlotId("heavyShell")
                .health(100)
                .fuel(200)
                .weaponAmmo(Map.of("heavyShell", -1))
                .build();

        TankState target = TankState.builder()
                .entityId(2L)
                .playerId(2L)
                .definitionId("cyber")
                .position(new OnlineVec2Dto(540, 386))
                .selectedProjectileSlotId("heavyShell")
                .health(100)
                .fuel(200)
                .weaponAmmo(Map.of("heavyShell", -1))
                .build();

        World world = new World();
        world.match().activePlayerId(1L);
        world.tanks().put(1L, shooter);
        world.tanks().put(2L, target);

        // Aim directly at target (angle 0 rad, power 360.0)
        FireIntentIntentRequestPayload fireIntent = new FireIntentIntentRequestPayload(0.0, 360.0);
        var res = simulation.fire(content, world, terrain, "intent-focused", 100L, 1L, fireIntent);

        assertFalse(res.damagedTanks().isEmpty());
        assertEquals(75, res.damagedTanks().getFirst().damageDealt());
        assertEquals(25, target.health());
    }

    @Test
    void salvoWeaponGeneratesMultipleTrajectoriesWithStaggeredGravityAndDelays() {
        DefaultGameSimulation simulation = new DefaultGameSimulation();

        TankDefinition tankDef = new TankDefinition(
                "terra", "Terra", 100, 240, 24, 1, 5, 44, 28, 28.0, -14.0, null, List.of("gravelGatling")
        );
        com.tanks.server.websocket.gameplay.content.definitions.SalvoConfig salvoConfig =
                new com.tanks.server.websocket.gameplay.content.definitions.SalvoConfig(3, 0.1, List.of(0.92, 1.0, 1.08));
        ProjectileDefinition projDef = new ProjectileDefinition(
                "gravelGatling", "Gravel Gatling", null, null, new ProjectileVisual(3.5, "#78350f", "#d97706", "#fde68a"), 1.0, 1.0, 2,
                new Crater(22.0),
                new com.tanks.server.websocket.gameplay.content.damage.Radial(22.0, 22.0),
                null, null, salvoConfig, null, null
        );

        WorldDefinition rules = defaultWorld();
        GameContent content = new GameContent(
                "v1.0", rules, null, Map.of("terra", tankDef), Map.of("gravelGatling", projDef), null
        );

        List<Integer> surface = new ArrayList<>(Collections.nCopies(2400, 600));
        TerrainModel terrain = new TerrainModel(rules, surface);

        TankState shooter = TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("terra")
                .position(new OnlineVec2Dto(500, 586))
                .selectedProjectileSlotId("gravelGatling")
                .health(100)
                .fuel(240)
                .weaponAmmo(Map.of("gravelGatling", 2))
                .build();

        World world = new World();
        world.match().activePlayerId(1L);
        world.tanks().put(1L, shooter);

        FireIntentIntentRequestPayload fireIntent = new FireIntentIntentRequestPayload(-Math.PI / 4, 300.0);
        var resolution = simulation.fire(content, world, terrain, "intent-salvo", 100L, 1L, fireIntent);

        // Lead shot is the main trajectory; subMunitions contains the other 2 salvo shots
        assertNotNull(resolution.trajectory());
        assertFalse(resolution.trajectory().isEmpty());
        assertEquals(2, resolution.subMunitions().size());
        assertEquals(0.1, resolution.subMunitions().get(0).delaySeconds());
        assertEquals(0.2, resolution.subMunitions().get(1).delaySeconds());
    }

    @Test
    void apexSplitWeaponSplitsAtPeakTrajectoryIntoDamagePool() {
        DefaultGameSimulation simulation = new DefaultGameSimulation();

        TankDefinition tankDef = new TankDefinition(
                "glacies", "Glacies", 100, 240, 24, 1, 5, 44, 28, 28.0, -14.0, null, List.of("apexAvalanche")
        );
        com.tanks.server.websocket.gameplay.content.definitions.ApexSplitConfig apexConfig =
                new com.tanks.server.websocket.gameplay.content.definitions.ApexSplitConfig(6, 65, 120.0);
        ProjectileDefinition projDef = new ProjectileDefinition(
                "apexAvalanche", "Apex Avalanche", null, null, new ProjectileVisual(5.0, "#38bdf8", "#bae6fd", "#ffffff"), 1.0, 1.0, 1,
                new Crater(18.0),
                new com.tanks.server.websocket.gameplay.content.damage.Radial(18.0, 20.0),
                null, null, null, apexConfig, null
        );

        WorldDefinition rules = defaultWorld();
        GameContent content = new GameContent(
                "v1.0", rules, null, Map.of("glacies", tankDef), Map.of("apexAvalanche", projDef), null
        );

        List<Integer> surface = new ArrayList<>(Collections.nCopies(2400, 600));
        TerrainModel terrain = new TerrainModel(rules, surface);

        TankState shooter = TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("glacies")
                .position(new OnlineVec2Dto(500, 586))
                .selectedProjectileSlotId("apexAvalanche")
                .health(100)
                .fuel(240)
                .weaponAmmo(Map.of("apexAvalanche", 1))
                .build();

        World world = new World();
        world.match().activePlayerId(1L);
        world.tanks().put(1L, shooter);

        // High arc fire reaching peak
        FireIntentIntentRequestPayload highArcFire = new FireIntentIntentRequestPayload(-Math.PI / 3, 200.0);
        var resolution = simulation.fire(content, world, terrain, "intent-apex-high", 100L, 1L, highArcFire);

        // Should have split into dynamic shards at apex
        assertFalse(resolution.subMunitions().isEmpty(), "Apex weapon should split at peak of high trajectory");
        assertEquals(6, resolution.subMunitions().size());
    }

    @Test
    void apexSplitWeaponDoesNotSplitIfHittingObstacleBeforePeak() {
        DefaultGameSimulation simulation = new DefaultGameSimulation();

        TankDefinition tankDef = new TankDefinition(
                "glacies", "Glacies", 100, 240, 24, 1, 5, 44, 28, 28.0, -14.0, null, List.of("apexAvalanche")
        );
        com.tanks.server.websocket.gameplay.content.definitions.ApexSplitConfig apexConfig =
                new com.tanks.server.websocket.gameplay.content.definitions.ApexSplitConfig(6, 65, 120.0);
        ProjectileDefinition projDef = new ProjectileDefinition(
                "apexAvalanche", "Apex Avalanche", null, null, new ProjectileVisual(5.0, "#38bdf8", "#bae6fd", "#ffffff"), 1.0, 1.0, 1,
                new Crater(18.0),
                new com.tanks.server.websocket.gameplay.content.damage.Radial(18.0, 20.0),
                null, null, null, apexConfig, null
        );

        WorldDefinition rules = defaultWorld();
        GameContent content = new GameContent(
                "v1.0", rules, null, Map.of("glacies", tankDef), Map.of("apexAvalanche", projDef), null
        );

        List<Integer> surface = new ArrayList<>(Collections.nCopies(2400, 600));
        // Put a wall in front of tank (outside wheelbase)
        for (int x = 550; x <= 590; x++) {
            surface.set(x, 200);
        }
        TerrainModel terrain = new TerrainModel(rules, surface);

        TankState shooter = TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("glacies")
                .position(new OnlineVec2Dto(500, 586))
                .selectedProjectileSlotId("apexAvalanche")
                .health(100)
                .fuel(240)
                .weaponAmmo(Map.of("apexAvalanche", 1))
                .build();

        World world = new World();
        world.match().activePlayerId(1L);
        world.tanks().put(1L, shooter);

        // Firing towards the wall while still ascending
        FireIntentIntentRequestPayload earlyCollisionFire = new FireIntentIntentRequestPayload(-Math.PI / 4, 300.0);
        var resolution = simulation.fire(content, world, terrain, "intent-apex-wall", 100L, 1L, earlyCollisionFire);

        // Wall hit while ascending means no apex split
        assertTrue(resolution.subMunitions().isEmpty(), "Apex weapon should not split if collision occurs before apex");
    }

    @Test
    void bouncerWeaponGenerates4SuccessiveBounces() {
        DefaultGameSimulation simulation = new DefaultGameSimulation();

        TankDefinition tankDef = new TankDefinition(
                "ignis", "Ignis", 100, 240, 24, 1, 5, 44, 28, 28.0, -14.0, null, List.of("lavaHopper")
        );
        com.tanks.server.websocket.gameplay.content.definitions.BouncerConfig bouncerConfig =
                new com.tanks.server.websocket.gameplay.content.definitions.BouncerConfig(4, 4.0, 18, 32.0);
        ProjectileDefinition projDef = new ProjectileDefinition(
                "lavaHopper", "Lava Hopper", null, null, new ProjectileVisual(5.0, "#f97316", "#facc15", "#ef4444"), 1.0, 1.0, 1,
                new Crater(32.0),
                new com.tanks.server.websocket.gameplay.content.damage.Radial(32.0, 18.0),
                null, null, null, null, bouncerConfig
        );

        WorldDefinition rules = defaultWorld();
        GameContent content = new GameContent(
                "v1.0", rules, null, Map.of("ignis", tankDef), Map.of("lavaHopper", projDef), null
        );

        List<Integer> surface = new ArrayList<>(Collections.nCopies(2400, 600));
        TerrainModel terrain = new TerrainModel(rules, surface);

        TankState shooter = TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("ignis")
                .position(new OnlineVec2Dto(500, 586))
                .selectedProjectileSlotId("lavaHopper")
                .health(100)
                .fuel(240)
                .weaponAmmo(Map.of("lavaHopper", 1))
                .build();

        TankState target = TankState.builder()
                .entityId(2L)
                .playerId(2L)
                .definitionId("ignis")
                .position(new OnlineVec2Dto(600, 586))
                .selectedProjectileSlotId("lavaHopper")
                .health(100)
                .fuel(240)
                .weaponAmmo(Map.of("lavaHopper", 1))
                .build();

        World world = new World();
        world.match().activePlayerId(1L);
        world.tanks().put(1L, shooter);
        world.tanks().put(2L, target);

        FireIntentIntentRequestPayload fireIntent = new FireIntentIntentRequestPayload(-Math.PI / 4, 200.0);
        var resolution = simulation.fire(content, world, terrain, "intent-bouncer", 100L, 1L, fireIntent);

        // Initial bounce is the main impact; subsequent 3 bounces are in subMunitions
        assertEquals(3, resolution.subMunitions().size(), "Bouncer with bounceCount 4 should produce 3 subsequent bounce submunitions");
        assertTrue(resolution.subMunitions().get(0).delaySeconds() > 0);
        assertTrue(resolution.subMunitions().get(1).delaySeconds() > resolution.subMunitions().get(0).delaySeconds());
        assertTrue(resolution.subMunitions().get(2).delaySeconds() > resolution.subMunitions().get(1).delaySeconds());
    }

    @Test
    void typedHazardTrailIsCreatedWithCorrectHazardType() {
        DefaultGameSimulation simulation = new DefaultGameSimulation();

        TankDefinition tankDef = new TankDefinition(
                "ignis", "Ignis", 100, 240, 24, 1, 5, 44, 28, 28.0, -14.0, null, List.of("dragonsBreath")
        );
        com.tanks.server.websocket.gameplay.content.definitions.DamageTrailConfig trailConfig =
                new com.tanks.server.websocket.gameplay.content.definitions.DamageTrailConfig(50.0, 12.0, 5.0,
                        com.tanks.server.websocket.gameplay.content.definitions.HazardType.FIRE);
        ProjectileDefinition projDef = new ProjectileDefinition(
                "dragonsBreath", "Dragon's Breath", null, null, new ProjectileVisual(5.0, "#ef4444", "#f97316", "#ffffff"), 1.0, 1.0, 1,
                new Crater(28.0),
                new com.tanks.server.websocket.gameplay.content.damage.Radial(28.0, 25.0),
                null, trailConfig, null, null, null
        );

        WorldDefinition rules = defaultWorld();
        GameContent content = new GameContent(
                "v1.0", rules, null, Map.of("ignis", tankDef), Map.of("dragonsBreath", projDef), null
        );

        List<Integer> surface = new ArrayList<>(Collections.nCopies(2400, 600));
        TerrainModel terrain = new TerrainModel(rules, surface);

        TankState shooter = TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("ignis")
                .position(new OnlineVec2Dto(500, 586))
                .selectedProjectileSlotId("dragonsBreath")
                .health(100)
                .fuel(240)
                .weaponAmmo(Map.of("dragonsBreath", 1))
                .build();

        World world = new World();
        world.match().activePlayerId(1L);
        world.tanks().put(1L, shooter);

        FireIntentIntentRequestPayload fireIntent = new FireIntentIntentRequestPayload(-Math.PI / 4, 200.0);
        simulation.fire(content, world, terrain, "intent-fire-trail", 100L, 1L, fireIntent);

        assertEquals(1, world.damageTrails().size());
        var trail = world.damageTrails().getFirst();
        assertEquals(com.tanks.server.websocket.gameplay.content.definitions.HazardType.FIRE, trail.hazardType());
        assertEquals(50.0, trail.radius());
        assertEquals(12.0, trail.damagePerSecond());
    }
}

