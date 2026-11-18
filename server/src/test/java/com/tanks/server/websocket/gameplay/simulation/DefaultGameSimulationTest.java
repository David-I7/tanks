package com.tanks.server.websocket.gameplay.simulation;

import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.FireIntentRequestPayload;
import com.tanks.server.websocket.gameplay.content.GameContent;
import com.tanks.server.websocket.gameplay.content.definitions.ProjectileDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.TankDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.WorldDefinition;
import com.tanks.server.websocket.gameplay.world.TankState;
import com.tanks.server.websocket.gameplay.world.TerrainModel;
import com.tanks.server.websocket.gameplay.world.World;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

class DefaultGameSimulationTest {

    @Test
    void fireCalculatesVelocityUsingStandardRadiansWithoutFacingMultiplication() {
        DefaultGameSimulation simulation = new DefaultGameSimulation();

        TankDefinition tankDef = new TankDefinition(
                "cyber", "Cyber", "Cyber tank", 100, 200, 8, 1, 5, 32, 16, null, List.of("basicShell")
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
                .facing(1)
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
                .facing(-1)
                .aimAngle(-Math.PI / 4)
                .power(1.0)
                .selectedProjectileSlotId("basicShell")
                .health(100)
                .fuel(200)
                .build();

        World worldLeft = new World();
        worldLeft.match().activePlayerId(2L);
        worldLeft.tanks().put(2L, tankLeft);

        FireIntentRequestPayload fireRightAim = new FireIntentRequestPayload(-Math.PI / 4, 1.0);

        var resRightFacing = simulation.fire(content, worldRight, terrain, "intent-1", 100L, 1L, fireRightAim);
        var resLeftFacing = simulation.fire(content, worldLeft, terrain, "intent-2", 101L, 2L, fireRightAim);

        assertTrue(resRightFacing.trajectory().get(1).x() > resRightFacing.launch().x(), "Facing 1: x should increase when aiming -PI/4");
        assertTrue(resRightFacing.trajectory().get(1).y() < resRightFacing.launch().y(), "Facing 1: y should decrease (upward) when aiming -PI/4");

        assertTrue(resLeftFacing.trajectory().get(1).x() > resLeftFacing.launch().x(), "Facing -1: x should increase when aiming -PI/4");
        assertTrue(resLeftFacing.trajectory().get(1).y() < resLeftFacing.launch().y(), "Facing -1: y should decrease (upward) when aiming -PI/4");
    }
}
