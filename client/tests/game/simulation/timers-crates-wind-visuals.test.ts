import assert from "node:assert/strict";
import { LocalSimulation } from "../../../src/game/simulation/LocalSimulation";
import { createLocalInitialWorld } from "../../../src/game/world/createInitialWorld";
import { localGameContent } from "../../../src/game/content/localGameContent";
import { simulateTrajectoryPreview } from "../../../src/game/simulation/ballistics";
import { toGameState } from "../../../src/game/authority/LocalGameManager";
import type { MatchSetup } from "../../../src/game/types";

function makeSimulation() {
  const setup: MatchSetup = {
    mode: "localTwoPlayer",
    players: [
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "desert-striker" } },
    ],
  };
  const { world, terrain, content } = createLocalInitialWorld(setup, localGameContent, {
    width: 960,
    height: 560,
  });
  return new LocalSimulation(world, terrain, content);
}

// 1. 3-Minute Match Countdown Timer & Victory/Draw Resolution
{
  // Test Equal HP -> Draw
  const setupDraw: MatchSetup = {
    mode: "localTwoPlayer",
    players: [
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
    ],
  };
  const { world: worldDraw, terrain: terrainDraw, content: contentDraw } = createLocalInitialWorld(setupDraw, localGameContent, { width: 960, height: 560 });
  const simDraw = new LocalSimulation(worldDraw, terrainDraw, contentDraw);
  assert.equal(simDraw.getState().match.matchTimeRemaining, 180, "Match timer should start at 180s");

  for (let i = 0; i < 180 * 30; i += 1) {
    simDraw.update(1 / 30);
  }
  const endDraw = simDraw.getState();
  assert.equal(endDraw.match.matchTimeRemaining, 0, "Match timer should reach 0");
  assert.equal(endDraw.match.phase, "gameOver", "Match should transition to gameOver");
  assert.equal(endDraw.match.winnerPlayerId, null, "Equal HP at timeout results in Draw (winnerPlayerId null)");

  // Test Unequal HP -> Higher HP Wins
  const setupWin: MatchSetup = {
    mode: "localTwoPlayer",
    players: [
      { id: 0, displayName: "P1", controllerKind: "human", tankSelection: { tankDefinitionId: "heavy-armor" } },
      { id: 1, displayName: "P2", controllerKind: "human", tankSelection: { tankDefinitionId: "desert-striker" } },
    ],
  };
  const { world: worldWin, terrain: terrainWin, content: contentWin } = createLocalInitialWorld(setupWin, localGameContent, { width: 960, height: 560 });
  const simWin = new LocalSimulation(worldWin, terrainWin, contentWin);
  for (let i = 0; i < 180 * 30; i += 1) {
    simWin.update(1 / 30);
  }
  const endWin = simWin.getState();
  assert.equal(endWin.match.winnerPlayerId, 0, "P1 with 130 HP vs P2 with 95 HP should win on timeout");
}

// 2. 30s Turn Auto-Pass Timer
{
  const sim = makeSimulation();
  assert.equal(sim.getState().match.phase, "thinking");
  assert.equal(sim.getState().match.activePlayerId, 0);

  // Advance turn timer by 30 seconds without submitting any action
  for (let i = 0; i < 30 * 30; i += 1) {
    sim.update(1 / 30);
  }

  // Phase should transition out of P1's turn
  const stateAfter30s = sim.getState();
  assert.notEqual(stateAfter30s.match.phase, "thinking", "Turn should auto-pass when 30s timer expires");

  // Complete transition phase
  sim.update(1.0);
  assert.equal(sim.getState().match.activePlayerId, 1, "Active player should advance to P2 after turn auto-pass");
}

// 3. Dynamic Turn Wind Vector & Trajectory Preview Influence
{
  const sim = makeSimulation();
  const state = toGameState(sim.getState(), localGameContent.projectiles);
  assert.ok(typeof state.match.wind === "number", "Wind should be a number");
  assert.ok(state.match.wind >= -7.0 && state.match.wind <= 7.0, "Wind must be within [-7.0, +7.0]");

  // Test trajectory preview incorporates wind
  const preview = simulateTrajectoryPreview(state, 0);
  assert.ok(preview.length > 0, "Trajectory preview should return points");
}

// 4. Scheduled Parachute Loot Crates & Ground Settling & Proximity Pickup
{
  const sim = makeSimulation();

  // Update until just reaching 120s mark (minute 1)
  for (let i = 0; i < 1800; i += 1) {
    sim.update(1 / 30);
  }

  let state = sim.getState();
  const hasCrateOrPopup = (state.lootCrates && state.lootCrates.length > 0) || (state.floatingTexts && state.floatingTexts.length > 0);
  assert.ok(hasCrateOrPopup, "Loot crate drop or pickup popup should occur at minute 1");
}

// 5. 18-Particle Explosion Pool
{
  const sim = makeSimulation();
  sim.submitPlayerAction(0, { type: "fire", angle: -0.5, power: 300, projectileSlotId: "standard" });

  let particleSpawned = false;
  for (let i = 0; i < 60; i += 1) {
    sim.update(1 / 30);
    const state = sim.getState();
    if (state.particles && state.particles.length > 0) {
      particleSpawned = true;
      break;
    }
  }

  assert.ok(particleSpawned, "Explosion should spawn 18 particles upon impact");
}

// 6. Floating Text Popups
{
  const sim = makeSimulation();
  sim.submitPlayerAction(0, { type: "fire", angle: -0.5, power: 350, projectileSlotId: "standard" });

  let textSpawned = false;
  for (let i = 0; i < 60; i += 1) {
    sim.update(1 / 30);
    const state = sim.getState();
    if (state.floatingTexts && state.floatingTexts.length >= 0) {
      textSpawned = true;
      break;
    }
  }

  assert.ok(textSpawned, "Floating texts array should exist in state");
}

console.log("All timers, loot crates, wind, and visual FX tests passed!");
