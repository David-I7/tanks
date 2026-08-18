import { describe, it, expect } from "vitest";
import { LocalWorld } from "../../../../src/game/world/LocalWorld";
import { LocalTerrainModel } from "../../../../src/game/simulation/LocalTerrainModel";
import { testGameContent } from "../online/mockOnlineTestState";
import { LocalSimulation } from "../../../../src/game/simulation/LocalSimulation";

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
      testGameContent.tanks["heavy-armor"]!,
      200,
      terrain.getSurfaceY(200),
      testGameContent.projectiles,
    );

    const tank1Id = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      testGameContent.tanks["heavy-armor"]!,
      300,
      terrain.getSurfaceY(300),
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);

    const initialHealth = world.tanks.get(tank1Id)!.health;
    expect(initialHealth).toBe(100);

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
    terrain.surface.fill(500);

    world.createTank(
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      testGameContent.tanks["heavy-armor"]!,
      100,
      500,
      testGameContent.projectiles,
    );

    const tank1Id = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      testGameContent.tanks["heavy-armor"]!,
      150,
      500,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);

    // Aim directly right at Tank 1
    const fired = sim.submitPlayerAction(0, {
      type: "fire",
      angle: 0,
      power: 600,
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
    expect(finalHealth).toBe(100 - 48);
  });

  it("should decrement limited ammo and prevent firing when depleted", () => {
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
    terrain.surface.fill(500);

    const tank0Id = world.createTank(
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "vanguard-cyber" } },
      testGameContent.tanks["vanguard-cyber"]!,
      100,
      500,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);
    const tank0 = world.tanks.get(tank0Id)!;

    // basicShell has infinite ammo (-1)
    expect(tank0.weaponAmmo["basicShell"]).toBe(-1);
    // cluster has 1 ammo initially
    expect(tank0.weaponAmmo["cluster"]).toBe(1);

    // Fire cluster (1 ammo -> 0 ammo)
    const firstFire = sim.submitPlayerAction(0, {
      type: "fire",
      angle: -Math.PI / 4,
      power: 300,
      projectileSlotId: "cluster",
    });
    expect(firstFire).toBe(true);
    expect(tank0.weaponAmmo["cluster"]).toBe(0);

    // Reset phase back to thinking for next turn test
    world.match.phase = "thinking";

    // Attempting to fire depleted cluster returns false
    const secondFire = sim.submitPlayerAction(0, {
      type: "fire",
      angle: -Math.PI / 4,
      power: 300,
      projectileSlotId: "cluster",
    });
    expect(secondFire).toBe(false);

    // Firing basicShell succeeds because it has infinite ammo
    const basicFire = sim.submitPlayerAction(0, {
      type: "fire",
      angle: -Math.PI / 4,
      power: 300,
      projectileSlotId: "basicShell",
    });
    expect(basicFire).toBe(true);
  });

  it("should spawn and simulate submunitions upon cluster impact", () => {
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
    terrain.surface.fill(500);

    world.createTank(
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "vanguard-cyber" } },
      testGameContent.tanks["vanguard-cyber"]!,
      100,
      500,
      testGameContent.projectiles,
    );

    const tank1Id = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      testGameContent.tanks["heavy-armor"]!,
      300,
      500,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);

    // Fire cluster weapon
    sim.submitPlayerAction(0, {
      type: "fire",
      angle: -Math.PI / 4,
      power: 350,
      projectileSlotId: "cluster",
    });

    expect(world.match.phase).toBe("ballistics");

    let submunitionsObserved = false;
    for (let frame = 0; frame < 180; frame++) {
      sim.update(0.016);
      if (world.projectiles.size > 1) {
        submunitionsObserved = true;
      }
      if (world.match.phase !== "ballistics" && world.projectiles.size === 0) {
        break;
      }
    }

    expect(submunitionsObserved).toBe(true);
    expect(world.tanks.get(tank1Id)!.health).toBeLessThanOrEqual(100);
  });
});
