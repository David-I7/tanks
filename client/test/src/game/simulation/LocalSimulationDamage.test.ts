// @ts-nocheck
import { describe, it, expect } from "vitest";
import { LocalWorld } from "../../../src/game/world/LocalWorld";
import { LocalTerrainModel } from "../../../src/game/simulation/LocalTerrainModel";
import { localGameContent } from "../../../src/game/rendering/ResourceManager";
import { LocalSimulation } from "../../../src/game/simulation/LocalSimulation";

describe("LocalSimulation damage calculation", () => {
  it("should deal damage to an enemy tank when hit by a projectile splash blast", () => {
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

    const terrain = new LocalTerrainModel(1280, 720);

    const tank0Id = world.createTank(
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      localGameContent.tanks["heavy-armor"]!,
      200,
      terrain.getSurfaceY(200),
    );

    const tank1Id = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      localGameContent.tanks["heavy-armor"]!,
      300,
      terrain.getSurfaceY(300),
    );

    const sim = new LocalSimulation(world, terrain, localGameContent);

    const initialHealth = world.tanks.get(tank1Id)!.health;
    expect(initialHealth).toBe(130);

    const fired = sim.submitPlayerAction(0, {
      type: "fire",
      angle: 0,
      power: 200,
      projectileSlotId: "basicShell",
    });

    expect(fired).toBe(true);
    expect(world.match.phase).toBe("ballistics");

    for (let frame = 0; frame < 120; frame++) {
      sim.update(0.016);
      if (world.match.phase !== "ballistics" && world.projectiles.size === 0) {
        break;
      }
    }

    const finalHealth = world.tanks.get(tank1Id)!.health;
    expect(finalHealth).toBeLessThan(initialHealth);
  });

  it("should deal full direct hit damage when a projectile directly strikes a tank", () => {
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

    const terrain = new LocalTerrainModel(1280, 720);

    world.createTank(
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      localGameContent.tanks["heavy-armor"]!,
      100,
      terrain.getSurfaceY(100),
    );

    const tank1Id = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      localGameContent.tanks["heavy-armor"]!,
      150,
      terrain.getSurfaceY(150),
    );

    const sim = new LocalSimulation(world, terrain, localGameContent);

    // Aim directly right at Tank 1
    const fired = sim.submitPlayerAction(0, {
      type: "fire",
      angle: 0,
      power: 200,
      projectileSlotId: "basicShell",
    });

    expect(fired).toBe(true);

    for (let frame = 0; frame < 120; frame++) {
      sim.update(0.016);
      if (world.match.phase !== "ballistics" && world.projectiles.size === 0) {
        break;
      }
    }

    const finalHealth = world.tanks.get(tank1Id)!.health;
    // basicShell damage is 48
    expect(finalHealth).toBe(130 - 48);
  });
});
