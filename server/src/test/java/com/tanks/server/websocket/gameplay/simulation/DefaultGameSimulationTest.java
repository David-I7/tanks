package com.tanks.server.websocket.gameplay.simulation;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.FireIntentIntentRequestPayload;
import com.tanks.server.websocket.gameplay.content.GameContent;
import com.tanks.server.websocket.gameplay.content.definitions.ProjectileDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.TankDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition;
import com.tanks.server.websocket.gameplay.world.TankState;
import com.tanks.server.websocket.gameplay.world.TerrainModel;
import com.tanks.server.websocket.gameplay.world.World;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

class DefaultGameSimulationTest {

    @Test
    void fireCalculatesVelocityUsingStandardRadiansWithoutFacingMultiplication() {
        DefaultGameSimulation simulation = new DefaultGameSimulation();

        TankDefinition tankDef = new TankDefinition(
                "cyber", "Cyber", 100, 200, 8, 1, 5, 32, 16, null, List.of("basicShell")
        );

        ProjectileDefinition projDef = new ProjectileDefinition(
                "basicShell", "Basic Shell", "BS", 4, 600.0, 1.0, 0.0, null, null, null, null
        );

        WorldDefinition rules = new WorldDefinition(
                "forest", 2400, 768, 30, 0.0, 0.033, 10, 15, null, null, 0.0, 0.0
        );

        GameContent content = new GameContent(
                "v1.0", rules, Map.of("cyber", tankDef), Map.of("basicShell", projDef), null
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
                .build();

        World worldRight = new World();
        worldRight.match().activePlayerId(1L);
        worldRight.tanks().put(1L, tankRight);

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
                .build();

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
                "cyber", "Cyber", 100, 200, 8, 1, 5, 24, 24, null, List.of("basicShell", "cluster")
        );

        ProjectileDefinition projDef = new ProjectileDefinition(
                "cluster", "Cluster Bomb", "CB", 4, 600.0, 1.0, 0.0, null, null, null, null
        );

        WorldDefinition rules = new WorldDefinition(
                "forest", 2400, 768, 30, 0.0, 0.033, 10, 15, null, null, 0.0, 0.0
        );

        GameContent content = new GameContent(
                "v1.0", rules, Map.of("cyber", tankDef), Map.of("cluster", projDef), null
        );

        List<Integer> surface = new ArrayList<>(Collections.nCopies(2400, 600));
        TerrainModel terrain = new TerrainModel(rules, surface);

        java.util.Map<String, Integer> ammo = new java.util.HashMap<>();
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
                "cyber", "Cyber", 100, 200, 8, 1, 5, 24, 24, null, List.of("basicShell", "cluster")
        );

        WorldDefinition rules = new WorldDefinition(
                "forest", 2400, 768, 30, 0.0, 0.033, 10, 15, null, null, 0.0, 0.0
        );

        GameContent content = new GameContent(
                "v1.0", rules, Map.of("cyber", tankDef), Map.of(), null
        );

        java.util.Map<String, Integer> ammo = new java.util.HashMap<>();
        ammo.put("basicShell", -1);
        ammo.put("cluster", 0);

        TankState tank = TankState.builder()
                .entityId(1L)
                .playerId(1L)
                .definitionId("cyber")
                .position(new OnlineVec2Dto(500, 400))
                .weaponAmmo(ammo)
                .health(100)
                .fuel(200)
                .build();

        World world = new World();
        world.tanks().put(1L, tank);
        var crate = new com.tanks.server.websocket.gameplay.world.LootCrateState(
                "crate-1", "ammo", 505.0, 400.0, 400.0, false, false, 1
        );
        world.lootCrates().add(crate);

        DefaultGameSimulation.checkLootCratePickup(world, content, tank, tankDef, 500, 400);

        assertEquals(1, tank.weaponAmmo().get("cluster"));
        assertTrue(crate.collected());
        assertTrue(world.lootCrates().isEmpty());
    }
}
