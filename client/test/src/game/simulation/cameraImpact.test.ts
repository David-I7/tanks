// @ts-nocheck
import { describe, it, expect } from "vitest";
import { LocalWorld } from "../../../src/game/world/LocalWorld";
import { LocalTerrainModel } from "../../../src/game/simulation/LocalTerrainModel";
import { localGameContent } from "../../../src/game/rendering/ResourceManager";
import { LocalSimulation } from "../../../src/game/simulation/LocalSimulation";

describe("Camera impact tracking and turn transition", () => {
  it("should remain focused on impact site until turn transitions to the next player", () => {
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

    // Player 0 at x=500, Player 1 at x=1000
    world.createTank(
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      localGameContent.tanks["heavy-armor"]!,
      500,
      terrain.getSurfaceY(500),
    );

    world.createTank(
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      localGameContent.tanks["heavy-armor"]!,
      1000,
      terrain.getSurfaceY(1000),
    );

    const sim = new LocalSimulation(world, terrain, localGameContent);

    // Player 0 fires
    sim.submitPlayerAction(0, {
      type: "fire",
      angle: -Math.PI / 4,
      power: 450,
      projectileSlotId: "basicShell",
    });

    // Advance until ballistics resolves to impact
    let impactOccurred = false;
    for (let frame = 0; frame < 120; frame++) {
      sim.update(0.016);
      if (world.match.phase === "impact" || world.match.phase === "transition") {
        impactOccurred = true;
        break;
      }
    }

    expect(impactOccurred).toBe(true);

    const stateAtImpact = sim.getState();
    const cameraAtImpact = stateAtImpact.match.cameraX;

    // During impact/transition phases, camera should remain near impact site and NOT jump back to Player 0
    expect(cameraAtImpact).toBeGreaterThan(100);

    // Advance through the transition phase until turn completes (phase becomes thinking for Player 1)
    for (let frame = 0; frame < 60; frame++) {
      sim.update(0.016);
      if (world.match.phase === "thinking" && world.match.activePlayerId === 1) {
        break;
      }
    }

    expect(world.match.activePlayerId).toBe(1);

    // Give visualSim frames to lerp camera towards Player 1 at x=600
    for (let frame = 0; frame < 60; frame++) {
      sim.update(0.016);
    }

    const stateNextTurn = sim.getState();
    // Player 1 at x=600, centered in 960 viewport -> target cameraX ~ 120
    expect(stateNextTurn.match.cameraX).toBeGreaterThan(0);
  });
});
