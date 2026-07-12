import assert from "node:assert/strict";

import { createLocalGameAuthority } from "../src/game/authority/gameAuthority";
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
  GameAuthority,
  GameManager,
  GameMode,
  GameState,
  GameViewState,
} from "../src/game";

// Preferred high-level gameplay seam:
// GameAction in through GameAuthority, GameViewState out for assertions.
// Mode-specific simulation details stay hidden behind this boundary.

function createLocalAuthority(
  mode: Exclude<GameMode, "online"> = "localTwoPlayer",
): GameAuthority {
  return createLocalGameAuthority({
    mode,
    setup: createDefaultMatchSetup(mode),
    content: mockGameContent,
    worldSize: { width: 960, height: 560 },
  });
}

function requireViewState(authority: GameAuthority): GameViewState {
  const state = authority.getViewState();
  assert.ok(state);
  return state;
}

function requireGameState(manager: GameManager): GameState {
  const state = manager.getState();
  assert.ok(state);
  return state;
}

function updateUntil(
  authority: GameAuthority,
  predicate: (state: GameViewState) => boolean,
  frames = 360,
): GameViewState {
  for (let i = 0; i < frames; i += 1) {
    const state = requireViewState(authority);
    if (predicate(state)) return state;
    authority.update(1 / 30);
  }
  const state = requireViewState(authority);
  assert.ok(predicate(state), "expected condition before frame limit");
  return state;
}

{
  const authority = createLocalAuthority();

  const before = authority.getViewState();
  assert.ok(before);
  assert.equal(before.match.activePlayerId, 0);
  assert.equal(before.tanks[0]?.selectedProjectileSlotId, "standard");

  assert.equal(
    authority.submitAction({
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    true,
  );

  const after = authority.getViewState();
  assert.equal(after?.tanks[0]?.selectedProjectileSlotId, "mortar");
  authority.destroy();
}

{
  const manager: GameManager = createLocalGameManager({
    mode: "localTwoPlayer",
    setup: createDefaultMatchSetup("localTwoPlayer"),
    content: mockGameContent,
    worldSize: { width: 960, height: 560 },
  });
  const state = requireGameState(manager);

  assert.equal(state.match.activePlayerId, 0);
  assert.equal(state.projectileDefinitions, mockGameContent.projectiles);
  assert.equal(
    manager.submitAction({
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    true,
  );
  assert.equal(manager.getState()?.tanks[0]?.selectedProjectileSlotId, "mortar");
  manager.destroy();
}

{
  const simulationManager = createLocalSimulationManager({
    mode: "localTwoPlayer",
    setup: createDefaultMatchSetup("localTwoPlayer"),
    content: mockGameContent,
    worldSize: { width: 960, height: 560 },
  });
  const state = simulationManager.getState();
  assert.ok(state);
  assert.equal(
    Object.prototype.hasOwnProperty.call(state, "projectileDefinitions"),
    false,
  );

  let emittedHasDefinitions = true;
  const unsubscribe = simulationManager.subscribe((emitted) => {
    emittedHasDefinitions = Object.prototype.hasOwnProperty.call(
      emitted,
      "projectileDefinitions",
    );
  });

  assert.equal(emittedHasDefinitions, false);
  unsubscribe();
  simulationManager.destroy();
}

{
  const authority = createLocalAuthority();

  const view = authority.getViewState();
  assert.ok(view);
  assert.equal(view.terrain.kind, "heightmap");
  view.tanks[0]!.selectedProjectileSlotId = "heavy";
  view.terrain.surface[0] = -999;

  const nextView = authority.getViewState();
  assert.equal(nextView?.tanks[0]?.selectedProjectileSlotId, "standard");
  assert.notEqual(
    nextView?.terrain.kind === "heightmap" ? nextView.terrain.surface[0] : null,
    -999,
  );
  authority.destroy();
}

{
  const authority = createLocalAuthority("playerVsAi");

  assert.equal(
    authority.submitAction({
      type: "fire",
      angle: -0.6,
      power: 400,
      projectileSlotId: "standard",
    }),
    true,
  );

  for (
    let i = 0;
    i < 360 && authority.getViewState()?.match.activePlayerId !== 1;
    i += 1
  ) {
    authority.update(1 / 30);
  }

  assert.equal(authority.getViewState()?.match.activePlayerId, 1);
  assert.equal(authority.getViewState()?.match.phase, "thinking");
  assert.equal(authority.submitAction({ type: "move", direction: 1 }), false);
  assert.equal(
    authority.submitAction({ type: "move", direction: 1 }, "ai"),
    true,
  );
  authority.destroy();
}

{
  const authority = createLocalAuthority();
  const before = requireViewState(authority);
  const beforeX = before.tanks[0]!.position.x;
  const beforeFuel = before.tanks[0]!.fuel;

  assert.equal(authority.submitAction({ type: "move", direction: 1 }), true);

  const after = requireViewState(authority);
  assert.ok(after.tanks[0]!.position.x > beforeX);
  assert.equal(after.tanks[0]!.fuel, beforeFuel - 1);
  authority.destroy();
}

{
  const authority = createLocalAuthority();

  assert.equal(
    authority.submitAction({ type: "aim", angle: -0.72, power: 740 }),
    true,
  );

  const after = requireViewState(authority);
  assert.equal(after.tanks[0]!.aimAngle, -0.72);
  assert.equal(after.tanks[0]!.power, 680);
  authority.destroy();
}

{
  const authority = createLocalAuthority();

  assert.equal(
    authority.submitAction({
      type: "fire",
      angle: -0.6,
      power: 400,
      projectileSlotId: "heavy",
    }),
    true,
  );

  const after = requireViewState(authority);
  assert.equal(after.match.phase, "ballistics");
  assert.equal(after.projectiles[0]?.projectileDefinitionId, "heavyShell");
  assert.equal(after.projectiles[0]?.power, 400);
  assert.equal(after.tanks[0]?.selectedProjectileSlotId, "heavy");
  authority.destroy();
}

{
  const authority = createLocalAuthority();

  authority.submitAction({
    type: "fire",
    angle: 1.35,
    power: 520,
    projectileSlotId: "cluster",
  });

  const impact = updateUntil(
    authority,
    (state) => state.impactEvents.length > 0,
    240,
  );
  assert.ok(impact.impactEvents.length > 0);
  assert.equal(impact.impactEvents[0]?.animationId, "spark-burst");
  assert.equal(impact.match.phase, "impact");

  const nextTurn = updateUntil(
    authority,
    (state) =>
      state.match.activePlayerId === 1 && state.match.phase === "aiming",
    120,
  );
  assert.equal(nextTurn.match.activePlayerId, 1);
  assert.equal(nextTurn.match.phase, "aiming");
  authority.destroy();
}

{
  const authority = createLocalAuthority();
  const before = requireViewState(authority);
  assert.equal(before.terrain.kind, "heightmap");
  const beforeSurface = before.terrain.surface.slice();

  authority.submitAction({
    type: "fire",
    angle: 1.35,
    power: 520,
    projectileSlotId: "cluster",
  });

  const afterImpact = updateUntil(
    authority,
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
  authority.destroy();
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
  const authority = createLocalGameAuthority({
    mode: "localTwoPlayer",
    setup: createDefaultMatchSetup("localTwoPlayer"),
    content: lethalContent,
    worldSize: { width: 960, height: 560 },
  });

  authority.submitAction({
    type: "fire",
    angle: 1.35,
    power: 520,
    projectileSlotId: "cluster",
  });

  const terminal = updateUntil(
    authority,
    (state) => state.match.phase === "gameOver",
    240,
  );
  assert.equal(terminal.match.phase, "gameOver");
  assert.equal(terminal.match.winnerPlayerId, 0);
  assert.equal(
    terminal.tanks.find((tank) => tank.playerId === 1)?.alive,
    false,
  );
  authority.destroy();
}
