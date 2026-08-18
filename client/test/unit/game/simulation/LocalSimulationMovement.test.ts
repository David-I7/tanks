import { describe, it, expect } from "vitest";
import { LocalSimulation } from "../../../../src/game/simulation/LocalSimulation";
import { LocalWorld } from "../../../../src/game/world/LocalWorld";
import { LocalTerrainModel } from "../../../../src/game/simulation/LocalTerrainModel";
import { testGameContent } from "../online/mockOnlineTestState";

describe("LocalSimulation movement physics (server parity)", () => {
  it("consumes fuel proportionally to 2D distance on flat ground and slopes", () => {
    const terrain = new LocalTerrainModel(2400, 768);
    // Flat ground at y = 400
    for (let x = 0; x < 2400; x++) {
      terrain.surface[x] = 400;
    }

    const world = new LocalWorld({
      mode: "localTwoPlayer",
      phase: "thinking",
      activePlayerId: 0,
      playerCount: 2,
      turnNumber: 1,
      turnTimeRemaining: 30,
      matchTimeRemaining: 180,
      wind: 0,
      winnerPlayerId: null,
      biome: "forest",
      isCameraLocked: true,
      cameraX: 0,
    });

    const tankDef = testGameContent.tanks["vanguard-cyber"]!;
    world.createTank(
      {
        id: 0,
        displayName: "Player 1",
        controllerKind: "human",
        tankSelection: { tankDefinitionId: "vanguard-cyber" },
      },
      tankDef,
      200,
      400 - tankDef.height / 2,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);

    // Initial fuel is 240
    const tankEntityId = world.tankEntitiesByPlayer.get(0)!;
    const tank = world.tanks.get(tankEntityId)!;
    const pos = world.positions.get(tankEntityId)!;
    expect(tank.fuel).toBe(240);
    expect(pos.x).toBe(200);

    // One move action to the right (direction = 1) -> moves 4px across 4 steps on flat ground
    const accepted = sim.submitPlayerAction(0, { type: "move", direction: 1 });
    expect(accepted).toBe(true);
    expect(pos.x).toBe(204);
    // Flat ground: 4 steps * 1 fuel/step = 4 fuel spent
    expect(tank.fuel).toBe(236);
  });

  it("cannot climb cliffs exceeding climbCapability (5px)", () => {
    const terrain = new LocalTerrainModel(2400, 768);
    for (let x = 0; x < 2400; x++) {
      terrain.surface[x] = 400;
    }
    // Create a 10px high cliff at x = 202 (ground goes from y=400 to y=390)
    for (let x = 202; x < 2400; x++) {
      terrain.surface[x] = 390;
    }

    const world = new LocalWorld({
      mode: "localTwoPlayer",
      phase: "thinking",
      activePlayerId: 0,
      playerCount: 2,
      turnNumber: 1,
      turnTimeRemaining: 30,
      matchTimeRemaining: 180,
      wind: 0,
      winnerPlayerId: null,
      biome: "forest",
      isCameraLocked: true,
      cameraX: 0,
    });

    const tankDef = testGameContent.tanks["vanguard-cyber"]!;
    world.createTank(
      {
        id: 0,
        displayName: "Player 1",
        controllerKind: "human",
        tankSelection: { tankDefinitionId: "vanguard-cyber" },
      },
      tankDef,
      200,
      400 - tankDef.height / 2,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);
    const tankEntityId = world.tankEntitiesByPlayer.get(0)!;
    const pos = world.positions.get(tankEntityId)!;

    // Moving right should stop at x=201 before climbing the 10px cliff
    sim.submitPlayerAction(0, { type: "move", direction: 1 });
    expect(pos.x).toBe(201);
  });
});
