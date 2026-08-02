package com.tanks.server.websocket.gameplay;

import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.actions.ProjectileResolution;
import com.tanks.server.websocket.dto.gameplay.diffResponse.actions.SubMunitionTrajectoryDto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.actions.TurnTransition;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.TurnPhase;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.FireIntentIntentRequestPayload;
import com.tanks.server.websocket.gameplay.content.GameContent;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.simulation.DefaultGameSimulation;
import com.tanks.server.websocket.gameplay.world.DamageTrailState;
import com.tanks.server.websocket.gameplay.world.InitialWorldFactory;
import com.tanks.server.websocket.gameplay.world.TankState;
import com.tanks.server.websocket.gameplay.world.World;
import com.tanks.server.websocket.services.ServerSimulationLoopService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class BallisticsWindSubmunitionsDamageTrailsTest {

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
        simulationLoopService = new ServerSimulationLoopService(null, null);
    }

    @Test
    public void testWindTrajectoryOffset() {
        GameContent content = contentCatalog.current();
        var worldSetup = initialWorldFactory.create(content, 0, "PlayerA", "PlayerB");
        World worldNoWind = worldSetup.world();
        worldNoWind.match().wind(0.0);

        FireIntentIntentRequestPayload fireRequest = new FireIntentIntentRequestPayload(45.0, 500.0);
        ProjectileResolution resNoWind = gameSimulation.fire(content, worldNoWind, worldSetup.terrainModel(), "intent-1", 100L, 1L, fireRequest);

        World worldPosWind = new World(worldNoWind);
        worldPosWind.match().wind(50.0);
        ProjectileResolution resPosWind = gameSimulation.fire(content, worldPosWind, worldSetup.terrainModel(), "intent-2", 101L, 1L, fireRequest);

        World worldNegWind = new World(worldNoWind);
        worldNegWind.match().wind(-50.0);
        ProjectileResolution resNegWind = gameSimulation.fire(content, worldNegWind, worldSetup.terrainModel(), "intent-3", 102L, 1L, fireRequest);

        List<OnlineVec2Dto> trajNoWind = resNoWind.trajectory();
        List<OnlineVec2Dto> trajPosWind = resPosWind.trajectory();
        List<OnlineVec2Dto> trajNegWind = resNegWind.trajectory();

        int midIndex = Math.min(trajNoWind.size(), Math.min(trajPosWind.size(), trajNegWind.size())) / 2;
        assertTrue(midIndex > 1, "Trajectory should have multiple points");

        assertTrue(trajPosWind.get(midIndex).x() > trajNoWind.get(midIndex).x(),
                "Positive wind should push trajectory to the right");
        assertTrue(trajNegWind.get(midIndex).x() < trajNoWind.get(midIndex).x(),
                "Negative wind should push trajectory to the left");
    }

    @Test
    public void testSubMunitionsResolutionDto() {
        GameContent content = contentCatalog.current();
        var worldSetup = initialWorldFactory.create(content, 0, "PlayerA", "PlayerB");
        World world = worldSetup.world();
        TankState tankA = world.requireTankByPlayer(1L);
        tankA.selectedProjectileSlotId("cluster");

        FireIntentIntentRequestPayload fireRequest = new FireIntentIntentRequestPayload(60.0, 400.0);
        ProjectileResolution resolution = gameSimulation.fire(content, world, worldSetup.terrainModel(), "intent-cluster", 200L, 1L, fireRequest);

        assertNotNull(resolution.subMunitions(), "SubMunitions list should not be null");
        assertFalse(resolution.subMunitions().isEmpty(), "SubMunitions should be generated for cluster projectile");
        assertEquals(3, resolution.subMunitions().size(), "Cluster projectile should spawn 3 sub-munitions");

        for (SubMunitionTrajectoryDto sub : resolution.subMunitions()) {
            assertNotNull(sub.launch(), "SubMunition launch point should not be null");
            assertNotNull(sub.impact(), "SubMunition impact point should not be null");
            assertFalse(sub.trajectory().isEmpty(), "SubMunition trajectory should not be empty");
        }
    }

    @Test
    public void testTurnTransitionIncludesWind() {
        double testWind = 25.5;
        TurnTransition transition = TurnTransition.builder()
                .previousPlayerId(1L)
                .activePlayerId(2L)
                .turnNumber(2)
                .phase(TurnPhase.AIMING)
                .turnEndsAtServerTick(900L)
                .matchEndsAtServerTick(5400L)
                .wind(testWind)
                .build();

        assertEquals(testWind, transition.wind(), 0.001);
    }

    @Test
    public void testDamageTrailTickingAndExpiration() {
        GameContent content = contentCatalog.current();
        var worldSetup = initialWorldFactory.create(content, 0, "PlayerA", "PlayerB");
        World world = worldSetup.world();
        TankState tankB = world.requireTankByPlayer(2L);
        int initialHealth = tankB.health();

        DamageTrailState trail = DamageTrailState.builder()
                .id("trail-1")
                .ownerPlayerId(1L)
                .position(tankB.position())
                .radius(50.0)
                .damagePerSecond(30.0)
                .remainingTicks(10)
                .build();

        world.damageTrails().add(trail);
        assertEquals(1, world.damageTrails().size());

        simulationLoopService.tickDamageTrails(world);

        assertTrue(tankB.health() < initialHealth, "Tank in hazard area should take damage from damage trail");
        assertEquals(9, trail.remainingTicks());

        for (int i = 0; i < 9; i++) {
            simulationLoopService.tickDamageTrails(world);
        }

        assertTrue(world.damageTrails().isEmpty(), "Expired damage trail should be removed from world");
    }
}
