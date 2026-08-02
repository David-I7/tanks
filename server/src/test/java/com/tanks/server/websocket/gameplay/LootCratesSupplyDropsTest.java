package com.tanks.server.websocket.gameplay;

import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.gameplay.content.GameContent;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.simulation.DefaultGameSimulation;
import com.tanks.server.websocket.gameplay.world.InitialWorldFactory;
import com.tanks.server.websocket.gameplay.world.LootCrateState;
import com.tanks.server.websocket.gameplay.world.TankState;
import com.tanks.server.websocket.gameplay.world.World;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.ServerSimulationLoopService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

public class LootCratesSupplyDropsTest {

    private GameContentCatalog contentCatalog;
    private InitialWorldFactory initialWorldFactory;
    private DefaultGameSimulation gameSimulation;
    private ServerSimulationLoopService simulationLoopService;

    @BeforeEach
    public void setUp() {
        contentCatalog = new GameContentCatalog(new ObjectMapper());
        contentCatalog.init();
        initialWorldFactory = new InitialWorldFactory();
        gameSimulation = new DefaultGameSimulation();
        simulationLoopService = new ServerSimulationLoopService(null, null, null);
    }

    @Test
    public void testCrateLandingAnimationOverTicks() {
        GameContent content = contentCatalog.current();
        var worldSetup = initialWorldFactory.create(content, 0, "PlayerA", "PlayerB");
        World world = worldSetup.world();

        LootCrateState crate = LootCrateState.builder()
                .crateId("crate-test-1")
                .crateType("hp")
                .x(200.0)
                .y(0.0)
                .targetY(300.0)
                .isLanding(true)
                .collected(false)
                .value(25)
                .build();

        world.lootCrates().add(crate);

        GameSession session = GameSession.builder()
                .id(UUID.randomUUID())
                .gameContentVersion(content.version())
                .world(world)
                .terrainModel(worldSetup.terrainModel())
                .state(GameSessionState.STARTED)
                .build();

        simulationLoopService.tickLootCrates(session);
        assertTrue(crate.y() > 0.0, "Crate y should increase as it descends");
        assertTrue(crate.isLanding(), "Crate should still be landing");

        // Advance 60 ticks (2 seconds at 150px/s => 300px)
        for (int i = 0; i < 60; i++) {
            simulationLoopService.tickLootCrates(session);
        }

        assertEquals(300.0, crate.targetY(), 0.001);
        assertFalse(crate.isLanding(), "Crate should have finished landing when targetY is reached");
    }

    @Test
    public void testTankPickupCollisionAndHealthRestoration() {
        GameContent content = contentCatalog.current();
        var worldSetup = initialWorldFactory.create(content, 0, "PlayerA", "PlayerB");
        World world = worldSetup.world();
        TankState tankA = world.requireTankByPlayer(1L);

        tankA.health(50); // damaged tank

        LootCrateState hpCrate = LootCrateState.builder()
                .crateId("crate-hp-1")
                .crateType("hp")
                .x(tankA.position().x())
                .y(tankA.position().y())
                .targetY(tankA.position().y())
                .isLanding(false)
                .collected(false)
                .value(25)
                .build();

        world.lootCrates().add(hpCrate);

        GameSession session = GameSession.builder()
                .id(UUID.randomUUID())
                .gameContentVersion(content.version())
                .world(world)
                .terrainModel(worldSetup.terrainModel())
                .state(GameSessionState.STARTED)
                .build();

        simulationLoopService.tickLootCrates(session);

        assertEquals(75, tankA.health(), "HP crate pickup should restore 25 health");
        assertTrue(hpCrate.collected(), "Crate should be marked as collected");
        assertTrue(world.lootCrates().isEmpty(), "Collected crate should be removed from world");
    }

    @Test
    public void testTankPickupCollisionAndFuelRestoration() {
        GameContent content = contentCatalog.current();
        var worldSetup = initialWorldFactory.create(content, 0, "PlayerA", "PlayerB");
        World world = worldSetup.world();
        TankState tankA = world.requireTankByPlayer(1L);

        tankA.fuel(20); // low fuel

        LootCrateState fuelCrate = LootCrateState.builder()
                .crateId("crate-fuel-1")
                .crateType("fuel")
                .x(tankA.position().x())
                .y(tankA.position().y())
                .targetY(tankA.position().y())
                .isLanding(false)
                .collected(false)
                .value(50)
                .build();

        world.lootCrates().add(fuelCrate);

        GameSession session = GameSession.builder()
                .id(UUID.randomUUID())
                .gameContentVersion(content.version())
                .world(world)
                .terrainModel(worldSetup.terrainModel())
                .state(GameSessionState.STARTED)
                .build();

        simulationLoopService.tickLootCrates(session);

        assertEquals(70, tankA.fuel(), "Fuel crate pickup should restore 50 fuel");
        assertTrue(fuelCrate.collected());
    }
}
