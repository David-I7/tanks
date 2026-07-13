package com.tanks.server.websocket.gameplay;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.ArrayList;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import com.tanks.server.websocket.dto.gameplay.*;
import com.tanks.server.websocket.gameplay.content.*;
import com.tanks.server.websocket.gameplay.simulation.*;
import com.tanks.server.websocket.gameplay.world.*;

@DisplayName("Authoritative gameplay golden scenarios")
class GameSimulationTest {
    private final GameContent content = new GameContentCatalog().current();
    private final GameSimulation simulation = new DefaultGameSimulation();

    @Test @DisplayName("flat movement reaches the content-defined movement quantum")
    void flatMovementReachesTheMovementQuantum() {
        var fixture = flatWorld(200);
        var response = simulation.move(content, fixture.world, new TerrainModel(content.world(), fixture.surface),
                "flat", 1, new OnlinePlayerIntentRequestPayloads.Move(1), 0).orElseThrow();

        assertThat(response.to()).isEqualTo(new OnlineVec2Dto(108, 200));
        assertThat(response.movementPath()).hasSize(9);
        assertThat(response.partial()).isFalse();
        assertThat(response.fuelSpent()).isEqualTo(8);
    }

    @Test @DisplayName("sloped movement follows every column and charges integer fuel")
    void movementFollowsEveryTerrainColumnAndChargesIntegerFuel() {
        var fixture = flatWorld(200);
        for (int x = 101; x <= 108; x++) fixture.surface.set(x, 200 - (x - 100));
        var terrain = new TerrainModel(content.world(), fixture.surface);
        var response = simulation.move(content, fixture.world, terrain, "move", 1,
                new OnlinePlayerIntentRequestPayloads.Move(1), 10).orElseThrow();
        assertThat(response.movementPath()).hasSize(9);
        assertThat(response.movementPath()).extracting(OnlineVec2Dto::x)
                .containsExactly(100d, 101d, 102d, 103d, 104d, 105d, 106d, 107d, 108d);
        assertThat(response.to().y()).isEqualTo(192d);
        assertThat(response.fuelSpent()).isEqualTo(16);
        assertThat(response.fuelAfter()).isEqualTo(84);
    }

    @Test @DisplayName("narrow obstacles produce partial movement")
    void narrowObstacleProducesPartialMovement() {
        var fixture = flatWorld(200);
        fixture.surface.set(104, 180);
        var terrain = new TerrainModel(content.world(), fixture.surface);
        var response = simulation.move(content, fixture.world, terrain, "move", 1,
                new OnlinePlayerIntentRequestPayloads.Move(1), 0).orElseThrow();
        assertThat(response.partial()).isTrue();
        assertThat(response.to().x()).isEqualTo(103);
        assertThat(fixture.world.requireTankByPlayer(1).position()).isEqualTo(response.to());
    }

    @Test @DisplayName("fuel limits produce partial movement and charge completed columns only")
    void fuelLimitProducesPartialMovementAndChargesCompletedColumnsOnly() {
        var fixture = flatWorld(200);
        fixture.world.requireTankByPlayer(1).fuel(2);
        var terrain = new TerrainModel(content.world(), fixture.surface);

        var response = simulation.move(content, fixture.world, terrain, "fuel", 1,
                new OnlinePlayerIntentRequestPayloads.Move(1), 0).orElseThrow();

        assertThat(response.partial()).isTrue();
        assertThat(response.to().x()).isEqualTo(102);
        assertThat(response.fuelBefore()).isEqualTo(2);
        assertThat(response.fuelSpent()).isEqualTo(2);
        assertThat(response.fuelAfter()).isZero();
    }

    @Test @DisplayName("explosions clamp at Bedrock and settle unsupported tanks for free")
    void terrainMutationClampsAtBedrockAndSettlesTankForFree() {
        var fixture = flatWorld(500);
        var terrain = new TerrainModel(content.world(), fixture.surface);
        var tank = fixture.world.requireTankByPlayer(1);
        tank.position(new OnlineVec2Dto(100, 500));
        int fuel = tank.fuel();
        var patch = simulation.deformTerrain(content, fixture.world, terrain, "heavyShell", new OnlineVec2Dto(100, 515));
        assertThat(patch.patches()).hasSize(1);
        assertThat(terrain.surface()).allSatisfy(y -> assertThat(y).isLessThanOrEqualTo(content.world().bedrockY()));
        var settlements = simulation.settleUnsupportedTanks(content, fixture.world, terrain, 0);
        assertThat(settlements).hasSize(1);
        assertThat(tank.fuel()).isEqualTo(fuel);
        assertThat(settlements.getFirst().movementPath()).containsExactly(settlements.getFirst().from(), settlements.getFirst().to());
    }

    @Test @DisplayName("ledge departure adds free vertical settlement to the authoritative path")
    void downwardLedgeAddsFreeVerticalSettlementToMovementPath() {
        var fixture = flatWorld(200);
        fixture.surface.set(101, 220);
        var terrain = new TerrainModel(content.world(), fixture.surface);
        var response = simulation.move(content, fixture.world, terrain, "ledge", 1,
                new OnlinePlayerIntentRequestPayloads.Move(1), 0).orElseThrow();
        assertThat(response.movementPath()).startsWith(
                new OnlineVec2Dto(100, 200), new OnlineVec2Dto(101, 200), new OnlineVec2Dto(101, 220));
        assertThat(response.fuelSpent()).isGreaterThanOrEqualTo(1);
    }

    @Test @DisplayName("projectiles collide with current terrain and mutate before producing a patch")
    void projectileReadsCurrentTerrainAndMutatesItBeforePatchIsReturned() {
        var fixture = flatWorld(300);
        var terrain = new TerrainModel(content.world(), fixture.surface);
        var before = terrain.surface();
        var response = simulation.fire(content, fixture.world, terrain, "fire", 20, 1,
                new OnlinePlayerIntentRequestPayloads.Fire(45, .5, "standard"));
        var patch = simulation.deformTerrain(content, fixture.world, terrain,
                response.projectileDefinitionId(), response.impact());
        assertThat(patch.patches()).isNotEmpty();
        assertThat(terrain.surface()).isNotEqualTo(before);
    }

    private Fixture flatWorld(int surfaceY) {
        var surface = new ArrayList<Integer>();
        for (int x = 0; x < content.world().width(); x++) surface.add(surfaceY);
        var world = new World();
        var tank = content.requireTank("vanguard");
        world.tanks().put(10L, new TankState(10, 1, "A", tank.id(), new OnlineVec2Dto(100, surfaceY), 1,
                tank.loadout().getFirst().id(), tank.maxHealth(), tank.maxFuel()));
        return new Fixture(world, surface);
    }

    private record Fixture(World world, ArrayList<Integer> surface) {}
}
