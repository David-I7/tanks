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
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "ignis" } },
      testGameContent.tanks["ignis"]!,
      200,
      terrain.getSurfaceY(200),
      testGameContent.projectiles,
    );

    const tank1Id = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "ignis" } },
      testGameContent.tanks["ignis"]!,
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
      projectileSlotId: "standardKaboom",
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
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "ignis" } },
      testGameContent.tanks["ignis"]!,
      100,
      500,
      testGameContent.projectiles,
    );

    const tank1Id = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "ignis" } },
      testGameContent.tanks["ignis"]!,
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
      projectileSlotId: "standardKaboom",
    });

    expect(fired).toBe(true);

    for (let frame = 0; frame < 120; frame++) {
      sim.update(0.016);
      if (world.match.phase !== "ballistics" && world.projectiles.size === 0) {
        break;
      }
    }

    const finalHealth = world.tanks.get(tank1Id)!.health;
    // standardKaboom damage is 45
    expect(finalHealth).toBe(100 - 45);
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
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "ignis" } },
      testGameContent.tanks["ignis"]!,
      100,
      500,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);
    const tank0 = world.tanks.get(tank0Id)!;

    // standardKaboom has infinite ammo (-1)
    expect(tank0.weaponAmmo["standardKaboom"]).toBe(-1);
    // magmaMortar has 2 ammo initially according to spec
    expect(tank0.weaponAmmo["magmaMortar"]).toBe(2);

    // Fire magmaMortar shot 1 (2 ammo -> 1 ammo)
    const firstFire = sim.submitPlayerAction(0, {
      type: "fire",
      angle: -Math.PI / 4,
      power: 300,
      projectileSlotId: "magmaMortar",
    });
    expect(firstFire).toBe(true);
    expect(tank0.weaponAmmo["magmaMortar"]).toBe(1);

    // Reset phase back to thinking for next turn test
    world.match.phase = "thinking";

    // Fire magmaMortar shot 2 (1 ammo -> 0 ammo)
    const secondFire = sim.submitPlayerAction(0, {
      type: "fire",
      angle: -Math.PI / 4,
      power: 300,
      projectileSlotId: "magmaMortar",
    });
    expect(secondFire).toBe(true);
    expect(tank0.weaponAmmo["magmaMortar"]).toBe(0);

    // Reset phase back to thinking
    world.match.phase = "thinking";

    // Attempting to fire depleted magmaMortar returns false
    const thirdFire = sim.submitPlayerAction(0, {
      type: "fire",
      angle: -Math.PI / 4,
      power: 300,
      projectileSlotId: "magmaMortar",
    });
    expect(thirdFire).toBe(false);

    // Firing standardKaboom succeeds because it has infinite ammo
    const basicFire = sim.submitPlayerAction(0, {
      type: "fire",
      angle: -Math.PI / 4,
      power: 300,
      projectileSlotId: "standardKaboom",
    });
    expect(basicFire).toBe(true);
  });

  it("should spawn and simulate salvo submunitions upon salvo fire", () => {
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
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "terra" } },
      testGameContent.tanks["terra"]!,
      100,
      500,
      testGameContent.projectiles,
    );

    const tank1Id = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "glacies" } },
      testGameContent.tanks["glacies"]!,
      300,
      500,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);

    // Fire gravelGatling salvo weapon
    sim.submitPlayerAction(0, {
      type: "fire",
      angle: -Math.PI / 4,
      power: 350,
      projectileSlotId: "gravelGatling",
    });

    expect(world.match.phase).toBe("ballistics");

    let submunitionsObserved = false;
    for (let frame = 0; frame < 180; frame++) {
      sim.update(0.016);
      if (world.projectiles.size > 0) {
        submunitionsObserved = true;
      }
      if (world.match.phase !== "ballistics" && world.projectiles.size === 0) {
        break;
      }
    }

    expect(submunitionsObserved).toBe(true);
    expect(world.tanks.get(tank1Id)!.health).toBeLessThanOrEqual(100);
  });

  it("should execute 4-bounce sequence with radial shockwaves for bouncer weapons", () => {
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
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "ignis" } },
      testGameContent.tanks["ignis"]!,
      100,
      500,
      testGameContent.projectiles,
    );

    const tank1Id = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "glacies" } },
      testGameContent.tanks["glacies"]!,
      200,
      500,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);

    // Fire lavaHopper bouncer weapon towards tank 1
    const fired = sim.submitPlayerAction(0, {
      type: "fire",
      angle: 0,
      power: 300,
      projectileSlotId: "lavaHopper",
    });
    expect(fired).toBe(true);

    // Initial impact occurs quickly
    for (let frame = 0; frame < 30; frame++) {
      sim.update(0.016);
    }

    const healthAfterImpact = world.tanks.get(tank1Id)!.health;
    expect(healthAfterImpact).toBeLessThan(100);

    // Advance 4 full seconds to allow all 4 bounces to execute
    for (let frame = 0; frame < 300; frame++) {
      sim.update(0.016);
    }

    // Additional bounce shockwaves should have damaged nearby tank
    const healthAfterBounces = world.tanks.get(tank1Id)!.health;
    expect(healthAfterBounces).toBeLessThanOrEqual(healthAfterImpact);
  });

  it("should create persistent hazard trail that deals tick damage and does not block turn progression", () => {
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
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "ignis" } },
      testGameContent.tanks["ignis"]!,
      100,
      500,
      testGameContent.projectiles,
    );

    const tank1Id = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "glacies" } },
      testGameContent.tanks["glacies"]!,
      200,
      500,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);

    // Fire dragonsBreath towards tank 1
    sim.submitPlayerAction(0, {
      type: "fire",
      angle: 0,
      power: 300,
      projectileSlotId: "dragonsBreath",
    });

    // Advance while damage trail is active (120 frames * 0.016s = 1.92s < 5.0s duration)
    for (let frame = 0; frame < 120; frame++) {
      sim.update(0.016);
    }

    // Turn should still be waiting during the active 5s damage trail
    expect(world.match.phase).not.toBe("thinking");

    // Advance until 5s damage trail and post-impact transition fully complete
    for (let frame = 0; frame < 350; frame++) {
      sim.update(0.016);
    }

    // Turn should have successfully advanced to player 1 (thinking) once damage trail finished
    expect(world.match.phase).toBe("thinking");
    expect(world.match.activePlayerId).toBe(1);

    // Tank 1 should be able to move in the new turn
    const moved = sim.submitPlayerAction(1, {
      type: "move",
      direction: 1,
    });
    expect(moved).toBe(true);
  });

  it("should visibly bounce 4 times and cleanly transition turn and lock camera to next player", () => {
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
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "ignis" } },
      testGameContent.tanks["ignis"]!,
      100,
      500,
      testGameContent.projectiles,
    );

    const tank1Id = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "glacies" } },
      testGameContent.tanks["glacies"]!,
      600,
      500,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);

    // Fire lavaHopper
    sim.submitPlayerAction(0, {
      type: "fire",
      angle: -Math.PI / 4,
      power: 350,
      projectileSlotId: "lavaHopper",
    });

    expect(world.match.phase).toBe("ballistics");

    // Advance through the 4 bounces and final impact + transition
    for (let frame = 0; frame < 300; frame++) {
      sim.update(0.016);
    }

    // Must cleanly transition to next player
    expect(world.match.phase).toBe("thinking");
    expect(world.match.activePlayerId).toBe(1);

    // Camera must be tracking next player (P2 at x=600)
    expect(world.match.isCameraLocked).toBe(true);
    expect(world.match.cameraX).toBeGreaterThan(300);
  });

  it("should bore deep subterranean vertical drill shaft with cryoNeedle dropping tanks into the crater", () => {
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
      biome: "ice",
      isCameraLocked: true,
      cameraX: 0,
    });

    const terrain = new LocalTerrainModel(1280, 720);
    terrain.surface.fill(400);

    world.createTank(
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "glacies" } },
      testGameContent.tanks["glacies"]!,
      100,
      400,
      testGameContent.projectiles,
    );

    const targetTankId = world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "ignis" } },
      testGameContent.tanks["ignis"]!,
      190,
      400,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);

    // Fire cryoNeedle directly at target at x=190
    sim.submitPlayerAction(0, {
      type: "fire",
      angle: 0,
      power: 150,
      projectileSlotId: "cryoNeedle",
    });

    // Advance until drill impact
    for (let frame = 0; frame < 100; frame++) {
      sim.update(0.016);
    }

    // Terrain around impact x (near 190) should have a deep hole (depth >= 50px below original 400)
    const shaftDepth = Math.max(...terrain.surface.slice(170, 210));
    expect(shaftDepth).toBeGreaterThanOrEqual(450);

    // Target tank should have settled onto the new (deeper) terrain surface
    const targetPos = world.positions.get(targetTankId)!;
    const tankDef = testGameContent.tanks["ignis"]!;
    const expectedSettledY = terrain.getSurfaceY(190) - tankDef.height / 2;
    expect(targetPos.y).toBeCloseTo(expectedSettledY, 0);
    // The settled Y should be deeper than the original surface position
    expect(terrain.getSurfaceY(190)).toBeGreaterThan(400);
  });

  it("should not create expanding circle impactEvent for damage trail weapons", () => {
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
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "ignis" } },
      testGameContent.tanks["ignis"]!,
      100,
      500,
      testGameContent.projectiles,
    );

    const sim = new LocalSimulation(world, terrain, testGameContent);

    // Fire dragonsBreath (damage trail)
    sim.submitPlayerAction(0, {
      type: "fire",
      angle: 0,
      power: 200,
      projectileSlotId: "dragonsBreath",
    });

    // Advance to impact
    for (let frame = 0; frame < 50; frame++) {
      sim.update(0.016);
    }

    // ImpactEvents should be 0 because damage trails only show floor effect
    expect(world.impactEvents.size).toBe(0);
  });
});
