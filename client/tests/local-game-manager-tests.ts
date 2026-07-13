import assert from "node:assert/strict";

import {
  mockGameContent,
  type GameContent,
} from "../src/game/content/mockGameContent";
import { createDefaultMatchSetup } from "../src/game/world/createInitialWorld";
import {
  createLocalGameManager,
  createLocalSimulationManager,
} from "../src/game";
import type {
  GameManager,
  GameMode,
  GameState,
} from "../src/game";

function createLocalManager(
  mode: Exclude<GameMode, "online"> = "localTwoPlayer",
): GameManager {
  return createLocalGameManager({
    mode,
    setup: createDefaultMatchSetup(mode),
    content: mockGameContent,
    initialGameViewport: { width: 960, height: 560 },
  });
}

function createLocalSimulationManagerForTest() {
  return createLocalSimulationManager({
    mode: "localTwoPlayer",
    setup: createDefaultMatchSetup("localTwoPlayer"),
    content: mockGameContent,
    initialGameViewport: { width: 960, height: 560 },
  });
}

function requireGameState(manager: GameManager): GameState {
  const state = manager.getState();
  assert.ok(state);
  return state;
}

function updateManagerUntil(
  manager: GameManager,
  predicate: (state: GameState) => boolean,
  frames = 360,
): GameState {
  for (let i = 0; i < frames; i += 1) {
    const state = manager.getState();
    if (predicate(state)) return state;
    manager.update(1 / 30);
  }
  const state = manager.getState();
  assert.ok(predicate(state), "expected condition before frame limit");
  return state;
}

function updateUntil(
  manager: GameManager,
  predicate: (state: GameState) => boolean,
  frames = 360,
): GameState {
  for (let i = 0; i < frames; i += 1) {
    const state = requireGameState(manager);
    if (predicate(state)) return state;
    manager.update(1 / 30);
  }
  const state = requireGameState(manager);
  assert.ok(predicate(state), "expected condition before frame limit");
  return state;
}

{
  const manager = createLocalManager();
  const state = requireGameState(manager);

  assert.equal(state.match.activePlayerId, 0);
  assert.equal(state.projectileDefinitions, mockGameContent.projectiles);
  assert.equal(manager.getState(), state);

  let subscribedState: GameState | null = null;
  const unsubscribe = manager.subscribe((nextState) => {
    subscribedState = nextState;
  });

  assert.equal(subscribedState, state);
  assert.equal(
    manager.submitAction({
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    true,
  );
  const afterAction = manager.getState();
  assert.notEqual(afterAction, state);
  assert.equal(subscribedState, afterAction);
  assert.equal(afterAction.tanks[0]?.selectedProjectileSlotId, "mortar");
  assert.equal(manager.getState(), afterAction);
  unsubscribe();
  manager.destroy();
}

{
  const simulationManager = createLocalSimulationManagerForTest();
  const state = simulationManager.getState();
  assert.equal(state.match.activePlayerId, 0);
  assert.equal("projectileDefinitions" in state, false);

  let subscribedState = null;
  const unsubscribe = simulationManager.subscribe((nextState) => {
    subscribedState = nextState;
  });
  assert.equal(subscribedState, state);

  assert.equal(
    simulationManager.submitPlayerAction(0, {
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    true,
  );
  const afterAction = simulationManager.getState();
  assert.notEqual(afterAction, state);
  assert.equal(subscribedState, afterAction);
  assert.equal(afterAction.tanks[0]?.tank.selectedProjectileSlotId, "mortar");
  unsubscribe();
  simulationManager.destroy();
}

{
  const manager = createLocalManager("playerVsAi");

  assert.equal(
    manager.submitAction({
      type: "fire",
      angle: -0.6,
      power: 400,
      projectileSlotId: "standard",
    }),
    true,
  );

  updateManagerUntil(
    manager,
    (state) =>
      state.match.activePlayerId === 1 && state.match.phase === "thinking",
  );

  assert.equal(manager.submitAction({ type: "move", direction: 1 }), false);

  const afterAiShot = updateManagerUntil(
    manager,
    (state) => state.match.phase === "ballistics",
    150,
  );
  assert.equal(afterAiShot.match.activePlayerId, 1);
  assert.ok(afterAiShot.projectiles.length > 0);
  manager.destroy();
}

{
  const manager = createLocalManager();
  const before = requireGameState(manager);
  const beforeX = before.tanks[0]!.position.x;
  const beforeFuel = before.tanks[0]!.fuel;

  assert.equal(manager.submitAction({ type: "move", direction: 1 }), true);

  const after = requireGameState(manager);
  assert.ok(after.tanks[0]!.position.x > beforeX);
  assert.equal(after.tanks[0]!.fuel, beforeFuel - 1);
  manager.destroy();
}

{
  const manager = createLocalManager();

  assert.equal(
    manager.submitAction({ type: "aim", angle: -0.72, power: 740 }),
    true,
  );

  const after = requireGameState(manager);
  assert.equal(after.tanks[0]!.aimAngle, -0.72);
  assert.equal(after.tanks[0]!.power, 680);
  manager.destroy();
}

{
  const manager = createLocalManager();

  assert.equal(
    manager.submitAction({
      type: "fire",
      angle: -0.6,
      power: 400,
      projectileSlotId: "heavy",
    }),
    true,
  );

  const after = requireGameState(manager);
  assert.equal(after.match.phase, "ballistics");
  assert.equal(after.projectiles[0]?.projectileDefinitionId, "heavyShell");
  assert.equal(after.projectiles[0]?.power, 400);
  assert.equal(after.tanks[0]?.selectedProjectileSlotId, "heavy");
  manager.destroy();
}

{
  const manager = createLocalManager();

  manager.submitAction({
    type: "fire",
    angle: 1.35,
    power: 520,
    projectileSlotId: "cluster",
  });

  const impact = updateUntil(
    manager,
    (state) => state.impactEvents.length > 0,
    240,
  );
  assert.ok(impact.impactEvents.length > 0);
  assert.equal(impact.impactEvents[0]?.animationId, "spark-burst");
  assert.equal(impact.match.phase, "impact");

  const nextTurn = updateUntil(
    manager,
    (state) =>
      state.match.activePlayerId === 1 && state.match.phase === "aiming",
    120,
  );
  assert.equal(nextTurn.match.activePlayerId, 1);
  assert.equal(nextTurn.match.phase, "aiming");
  manager.destroy();
}

{
  const manager = createLocalManager();
  const before = requireGameState(manager);
  assert.equal(before.terrain.kind, "heightmap");
  const beforeSurface = before.terrain.surface.slice();

  manager.submitAction({
    type: "fire",
    angle: 1.35,
    power: 520,
    projectileSlotId: "cluster",
  });

  const afterImpact = updateUntil(
    manager,
    (state) =>
      state.terrain.kind === "heightmap" &&
      state.terrain.surface.some(
        (height, index) => height !== beforeSurface[index],
      ),
    240,
  );

  assert.equal(afterImpact.terrain.kind, "heightmap");
  assert.ok(
    afterImpact.terrain.surface.some(
      (height, index) => height !== beforeSurface[index],
    ),
  );
  manager.destroy();
}

{
  const lethalContent: GameContent = {
    tanks: {
      ...mockGameContent.tanks,
      vanguard: { ...mockGameContent.tanks.vanguard, maxHealth: 10_000 },
      specter: { ...mockGameContent.tanks.specter, maxHealth: 1 },
    },
    projectiles: {
      ...mockGameContent.projectiles,
      cluster: {
        ...mockGameContent.projectiles.cluster,
        damageEffect: { type: "radial", radius: 5_000, damage: 100 },
      },
    },
  };
  const manager = createLocalGameManager({
    mode: "localTwoPlayer",
    setup: createDefaultMatchSetup("localTwoPlayer"),
    content: lethalContent,
    initialGameViewport: { width: 960, height: 560 },
  });

  manager.submitAction({
    type: "fire",
    angle: 1.35,
    power: 520,
    projectileSlotId: "cluster",
  });

  const terminal = updateUntil(
    manager,
    (state) => state.match.phase === "gameOver",
    240,
  );
  assert.equal(terminal.match.phase, "gameOver");
  assert.equal(terminal.match.winnerPlayerId, 0);
  assert.equal(
    terminal.tanks.find((tank) => tank.playerId === 1)?.alive,
    false,
  );
  manager.destroy();
}
