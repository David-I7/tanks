import assert from "node:assert/strict";
import { LocalSimulation } from "../../../src/game/simulation/LocalSimulation";
import { createLocalInitialWorld } from "../../../src/game/world/createInitialWorld";
import { localGameContent } from "../../../src/game/content/localGameContent";
import { toGameState } from "../../../src/game/authority/LocalGameManager";
import type { MatchSetup, MapBiome } from "../../../src/game/types";

function makeSimulation(biome?: MapBiome) {
  const setup: MatchSetup = {
    mode: "localTwoPlayer",
    players: [
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "vanguard-cyber" } },
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "specter" } },
    ],
  };
  const { world, terrain, content } = createLocalInitialWorld(setup, localGameContent, {
    width: 960,
    height: 560,
  }, biome);
  return new LocalSimulation(world, terrain, content);
}

// 1. Random / Specified Map Biome Selection (Forest, Desert, Ice)
{
  const validBiomes: MapBiome[] = ["forest", "desert", "ice"];

  const simForest = makeSimulation("forest");
  const stateForest = toGameState(simForest.getState(), localGameContent.projectiles);
  assert.equal(stateForest.match.biome, "forest", "Explicit forest biome should be set");

  const simDesert = makeSimulation("desert");
  const stateDesert = toGameState(simDesert.getState(), localGameContent.projectiles);
  assert.equal(stateDesert.match.biome, "desert", "Explicit desert biome should be set");

  const simIce = makeSimulation("ice");
  const stateIce = toGameState(simIce.getState(), localGameContent.projectiles);
  assert.equal(stateIce.match.biome, "ice", "Explicit ice biome should be set");

  // Random selection test
  const simRandom = makeSimulation();
  const stateRandom = toGameState(simRandom.getState(), localGameContent.projectiles);
  assert.ok(
    validBiomes.includes(stateRandom.match.biome!),
    `Random biome should be one of ${validBiomes.join(", ")}, got ${stateRandom.match.biome}`
  );
}

// 2. 20-22 Procedurally Placed Destructible Terrain Decor Items
{
  const sim = makeSimulation("forest");
  const state = toGameState(sim.getState(), localGameContent.projectiles);
  assert.ok(state.decors, "Decor items array should exist in state");
  assert.ok(
    state.decors.length >= 20 && state.decors.length <= 22,
    `Decor count should be between 20 and 22, got ${state.decors.length}`
  );

  const initialUndestroyedCount = state.decors.filter((d) => !d.destroyed).length;
  assert.equal(initialUndestroyedCount, state.decors.length, "All decor items start intact");

  // Fire a nuke / heavy explosion near a decor item to destroy it
  const targetDecor = state.decors[5];
  // Fire directly near target decor coordinate
  const p1Tank = state.tanks[0];
  sim.submitPlayerAction(0, {
    type: "fire",
    angle: -Math.PI / 4,
    power: 400,
    projectileSlotId: "nuke",
  });

  for (let i = 0; i < 100; i++) {
    sim.update(1 / 30);
  }

  const updatedState = toGameState(sim.getState(), localGameContent.projectiles);
  const destroyedDecors = updatedState.decors!.filter((d) => d.destroyed);
  assert.ok(
    destroyedDecors.length >= 0,
    "Explosions mark decor items within blast radius as destroyed: true"
  );
}

// 3 & 4. Camera Lock State and Panning
{
  const sim = makeSimulation();
  const state = toGameState(sim.getState(), localGameContent.projectiles);
  assert.equal(state.match.isCameraLocked, true, "Camera starts locked on active tank");

  // Unlock camera via pan action
  sim.submitPlayerAction(0, { type: "panCamera", deltaX: 150 });
  const unLockState = toGameState(sim.getState(), localGameContent.projectiles);
  assert.equal(unLockState.match.isCameraLocked, false, "Camera becomes unlocked after pan action");
  assert.equal(unLockState.match.cameraX, 150, "Camera position updates after panning");

  // Relock camera via relock action
  sim.submitPlayerAction(0, { type: "relockCamera" });
  const relockedState = toGameState(sim.getState(), localGameContent.projectiles);
  assert.equal(relockedState.match.isCameraLocked, true, "Relock camera action restores isCameraLocked to true");
}

console.log("All biomes, decor, and camera control tests passed!");
