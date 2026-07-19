import assert from "node:assert/strict";
import { getPlayerMatchConfig } from "../../../src/game/modes";
import {
  createDefaultMatchSetup,
  createInitialWorld,
} from "../../../src/game/world/createInitialWorld";
import { LocalSimulation } from "../../../src/game/simulation/LocalSimulation";
import {
  createLocalSimulationManager,
  type SimulationManager,
} from "../../../src/game/authority/simulationManager";
import { simulationStateToGameState } from "../../../src/game/authority/gameManager";
import { createCanvasSizing } from "../../../src/game/world/worldSizing";
import { collectGameActions } from "../../../src/game/input/CanvasInputSource";
import {
  findProjectileSlotAtCanvasPoint,
  getProjectileSelectorLayout,
} from "../../../src/game/input/inputHelpers";
import { TerrainModel } from "../../../src/game/simulation/TerrainModel";
import {
  mockGameContent,
  type GameContent,
} from "../../../src/game/content/mockGameContent";
import type { GameState, MatchSetup } from "../../../src/game/types";
import {
  createMockRemoteSimulationTransport,
  createRemoteSimulationManager,
  type RemoteSimulationManager,
} from "../../support/remoteSimulationSupport";

function makeSimulation(setup: MatchSetup = createDefaultMatchSetup("localTwoPlayer")) {
  const { world, terrain, content } = createInitialWorld(setup, mockGameContent, {
    width: 960,
    height: 560,
  });
  return new LocalSimulation(world, terrain, content);
}

function firstTank(simulation: LocalSimulation) {
  const tank = simulation.getState().tanks.find((entry) => entry.tank.playerId === 0);
  assert.ok(tank);
  return tank;
}

function gameStateWithActiveSecondTank(
  simulation: LocalSimulation,
): GameState {
  const state = simulationStateToGameState(simulation.getState(), mockGameContent.projectiles);
  const tanks = state.tanks.map((entry) => {
    if (entry.playerId === 1) {
      return {
        ...entry,
        loadout: withDistinctSecondPlayerSlotIds(entry.loadout),
        selectedProjectileSlotId: `second-player-${entry.selectedProjectileSlotId}`,
      };
    }
    return entry;
  });
  return {
    ...state,
    match: {
      ...state.match,
      activePlayerId: 1,
    },
    tanks,
  };
}

function withDistinctSecondPlayerSlotIds(
  loadout: GameState["tanks"][number]["loadout"],
): GameState["tanks"][number]["loadout"] {
  return loadout.map((slot) => ({
    ...slot,
    id: `second-player-${slot.id}`,
  }));
}

function canvasInteractionContext(gameState: GameState) {
  return {
    gameState,
    cameraX: 0,
    gameViewport: { width: 960, height: 560 },
    domCanvasRect: { left: 0, top: 0, width: 960, height: 560 },
  };
}

async function expectSharedSimulationManagerSelection(
  manager: SimulationManager | RemoteSimulationManager,
): Promise<void> {
  const seen: string[] = [];
  const unsubscribe = manager.subscribe((state) => {
    seen.push(state.tanks[0]?.tank.selectedProjectileSlotId ?? "");
  });
  assert.equal(
    manager.submitPlayerAction(0, {
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    true,
  );
  manager.update(0);
  await new Promise((resolve) => setTimeout(resolve, 5));
  unsubscribe();
  manager.destroy();
  assert.ok(seen.includes("mortar"));
}

{
  const simulation = makeSimulation();
  const state = simulation.getState();
  assert.equal(state.tanks.length, 2);
  assert.equal(state.tanks[0]?.tank.tankDefinitionId, "vanguard");
  assert.equal(state.tanks[1]?.tank.tankDefinitionId, "specter");
  assert.equal(state.tanks[0]?.tank.loadout.length, 5);
  assert.equal(state.tanks[0]?.tank.selectedProjectileSlotId, "standard");
  assert.equal(state.terrain.kind, "heightmap");
}

{
  const sizing = createCanvasSizing({
    domCanvasRect: { left: 0, top: 0, width: 960, height: 560 },
    devicePixelRatio: 2,
  });
  const sameViewportDifferentDpr = createCanvasSizing({
    domCanvasRect: { left: 10, top: 20, width: 960, height: 560 },
    devicePixelRatio: 3,
  });
  assert.deepEqual(sizing.gameViewport, sameViewportDifferentDpr.gameViewport);
  assert.deepEqual(sizing.dpiViewport, { width: 1920, height: 1120 });

  const first = createInitialWorld(
    createDefaultMatchSetup("localTwoPlayer"),
    mockGameContent,
    sizing.gameViewport,
  );
  const second = createInitialWorld(
    createDefaultMatchSetup("localTwoPlayer"),
    mockGameContent,
    sameViewportDifferentDpr.gameViewport,
  );
  assert.equal(first.terrain.width, second.terrain.width);
  assert.equal(first.terrain.height, second.terrain.height);
  assert.deepEqual(
    { width: first.terrain.width, height: first.terrain.height },
    { width: 2400, height: 560 },
  );

  const minimumTerrain = createInitialWorld(
    createDefaultMatchSetup("localTwoPlayer"),
    mockGameContent,
    { width: 200, height: 100 },
  ).terrain;
  assert.deepEqual(
    { width: minimumTerrain.width, height: minimumTerrain.height },
    { width: 800, height: 420 },
  );
}

{
  assert.throws(
    () =>
      createInitialWorld(
        {
          mode: "localTwoPlayer",
          players: [
            {
              id: 0,
              displayName: "One",
              controllerKind: "human",
              tankSelection: { tankDefinitionId: "missing" },
            },
          ],
        },
        mockGameContent,
        { width: 960, height: 560 },
      ),
    /Missing tank definition "missing"/,
  );

  const malformed: GameContent = {
    ...mockGameContent,
    tanks: {
      ...mockGameContent.tanks,
      broken: { ...mockGameContent.tanks.vanguard, id: "broken", loadout: [] },
    },
  };
  assert.throws(
    () =>
      createInitialWorld(
        {
          mode: "localTwoPlayer",
          players: [
            {
              id: 0,
              displayName: "One",
              controllerKind: "human",
              tankSelection: { tankDefinitionId: "broken" },
            },
          ],
        },
        malformed,
        { width: 960, height: 560 },
      ),
    /exactly five projectile slots/,
  );
}

{
  const simulation = makeSimulation();
  const before = firstTank(simulation).position.x;
  assert.equal(firstTank(simulation).tank.maxFuel, 240);
  simulation.submitPlayerAction(0, { type: "move", direction: 1 });
  const after = firstTank(simulation).position.x;
  assert.ok(
    after - before <= 3,
    `expected fluid movement step, moved ${after - before}px in one frame`,
  );
  assert.equal(firstTank(simulation).tank.fuel, 239);
}

{
  const simulation = makeSimulation();
  assert.equal(
    simulation.submitPlayerAction(1, {
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    false,
  );
  assert.equal(
    simulation.submitPlayerAction(0, {
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    true,
  );
  assert.equal(firstTank(simulation).tank.selectedProjectileSlotId, "mortar");
}

{
  await expectSharedSimulationManagerSelection(
    createLocalSimulationManager({
      setup: createDefaultMatchSetup("localTwoPlayer"),
      content: mockGameContent,
      initialGameViewport: { width: 960, height: 560 },
    }),
  );

  await expectSharedSimulationManagerSelection(
    createRemoteSimulationManager(
      createMockRemoteSimulationTransport({
        setup: createDefaultMatchSetup("online"),
        content: mockGameContent,
        width: 960,
        height: 560,
        latencyMs: 0,
      }),
    ),
  );
}

{
  const simulation = makeSimulation();
  assert.equal(
    simulation.submitPlayerAction(0, {
      type: "selectProjectileSlot",
      projectileSlotId: "heavy",
    }),
    true,
  );
  assert.equal(firstTank(simulation).tank.selectedProjectileSlotId, "heavy");

  assert.equal(
    simulation.submitPlayerAction(0, {
      type: "fire",
      angle: -0.6,
      power: 400,
      projectileSlotId: "heavy",
    }),
    true,
  );
  const state = simulation.getState();
  assert.equal(state.match.phase, "ballistics");
  assert.equal(state.projectiles[0]?.projectile.projectileDefinitionId, "heavyShell");
  assert.equal(state.projectiles[0]?.projectile.power, 400);
  assert.equal(state.tanks[0]?.tank.selectedProjectileSlotId, "heavy");
  assert.equal(state.projectiles[0]?.projectile.physics.gravityScale, 1.14);
}

{
  const simulation = makeSimulation();
  const state = simulation.getState();
  const slotCount = state.tanks[0]?.tank.loadout.length ?? 0;
  const layout = getProjectileSelectorLayout(960, 560, slotCount);
  const selectedSlot = findProjectileSlotAtCanvasPoint(
    simulationStateToGameState(state, mockGameContent.projectiles),
    960,
    560,
    layout.x + layout.slotSize + layout.gap + layout.slotSize / 2,
    layout.y + layout.slotSize / 2,
  );
  assert.equal(selectedSlot, "mortar");
}

{
  const simulation = makeSimulation();
  simulation.submitPlayerAction(0, {
    type: "fire",
    angle: 1.35,
    power: 520,
    projectileSlotId: "cluster",
  });
  for (let i = 0; i < 360 && simulation.getState().match.phase !== "impact"; i += 1) {
    simulation.update(1 / 30);
  }
  const state = simulation.getState();
  assert.equal(state.match.phase, "impact");
  assert.ok(state.impactEvents.length > 0);
  assert.equal(state.impactEvents[0]?.animationId, "spark-burst");
}

{
  const simulation = makeSimulation();
  const initialSurface = simulation.getState().terrain.surface.slice();
  simulation.submitPlayerAction(0, {
    type: "fire",
    angle: 1.35,
    power: 520,
    projectileSlotId: "cluster",
  });
  for (
    let i = 0;
    i < 360 &&
    simulation.getState().terrain.surface.every(
      (height, index) => height === initialSurface[index],
    );
    i += 1
  ) {
    simulation.update(1 / 30);
  }
  const state = simulation.getState();
  assert.ok(
    state.terrain.surface.some(
      (height, index) => height !== initialSurface[index],
    ),
  );
}

{
  const simulation = makeSimulation();
  const initialX = firstTank(simulation).position.x;
  for (let i = 0; i < 60; i += 1) {
    simulation.submitPlayerAction(0, { type: "move", direction: 1 });
  }
  assert.ok(firstTank(simulation).position.x > initialX);
  assert.equal(firstTank(simulation).tank.fuel, 180);

  const currentX = firstTank(simulation).position.x;
  simulation.submitPlayerAction(0, { type: "move", direction: 1 });
  assert.ok(firstTank(simulation).position.x > currentX);
}

{
  const simulation = makeSimulation();
  const initialActive = simulation.getState().match.activePlayerId;
  simulation.update(31);
  assert.equal(simulation.getState().match.activePlayerId, initialActive);

  // transition turns
  for (let i = 0; i < 150 && simulation.getState().match.activePlayerId === initialActive; i += 1) {
    simulation.update(1 / 30);
  }
  assert.notEqual(simulation.getState().match.activePlayerId, initialActive);
}

{
  const simulation = makeSimulation();
  const state = simulation.getState();
  const intents = collectGameActions({
    state: {
      pressedKeys: new Set(["ArrowRight"]),
      pointer: { clientX: 480, clientY: 280 },
      pendingPointerDown: null,
      pendingSlotNumber: 2,
    },
    context: canvasInteractionContext(simulationStateToGameState(state, mockGameContent.projectiles)),
  });
  assert.deepEqual(intents[0], { type: "move", direction: 1 });
  assert.deepEqual(intents[1], {
    type: "selectProjectileSlot",
    projectileSlotId: "mortar",
  });
  assert.equal(intents[2]?.type, "aim");
}

{
  const simulation = makeSimulation();
  const gameState = gameStateWithActiveSecondTank(simulation);
  const activeTank = gameState.tanks.find((entry) => entry.playerId === 1);
  assert.ok(activeTank);
  const layout = getProjectileSelectorLayout(
    960,
    560,
    activeTank.loadout.length,
  );

  const selectedSlot = findProjectileSlotAtCanvasPoint(
    gameState,
    960,
    560,
    layout.x + layout.slotSize + layout.gap + layout.slotSize / 2,
    layout.y + layout.slotSize / 2,
  );
  assert.equal(selectedSlot, "second-player-mortar");

  const intents = collectGameActions({
    state: {
      pressedKeys: new Set(),
      pointer: {
        clientX: activeTank.position.x + 100,
        clientY: activeTank.position.y - 22,
      },
      pendingPointerDown: null,
      pendingSlotNumber: 2,
    },
    context: canvasInteractionContext(gameState),
  });

  assert.deepEqual(intents[0], {
    type: "selectProjectileSlot",
    projectileSlotId: "second-player-mortar",
  });
  assert.equal(intents[1]?.type, "aim");
  assert.ok(
    intents[1]?.type === "aim" && Math.abs(intents[1].angle - (-0.2764)) < 0.001,
  );
}

{
  const transport = createMockRemoteSimulationTransport({
    setup: createDefaultMatchSetup("online"),
    content: mockGameContent,
    width: 960,
    height: 560,
    latencyMs: 0,
  });
  const seen: string[] = [];
  const unsubscribe = transport.onSimulationState((state) => {
    seen.push(state.tanks[0]?.tank.selectedProjectileSlotId ?? "");
  });
  transport.sendIntent({
    playerId: 0,
    intent: { type: "selectProjectileSlot", projectileSlotId: "mortar" },
  });
  await new Promise((resolve) => setTimeout(resolve, 5));
  unsubscribe();
  transport.destroy?.();
  assert.ok(seen.includes("mortar"));
}

{
  // Test local mode setup for Local Two-Player
  const setup = createDefaultMatchSetup("localTwoPlayer");
  assert.equal(setup.mode, "localTwoPlayer");
  assert.equal(setup.players.length, 2);
  assert.equal(setup.players[0]?.controllerKind, "human");
  assert.equal(setup.players[1]?.controllerKind, "human");
  assert.equal(setup.players[0]?.displayName, "Player 1");
  assert.equal(setup.players[1]?.displayName, "Player 2");

  const { world } = createInitialWorld(setup, mockGameContent, {
    width: 960,
    height: 560,
  });
  assert.equal(world.match.mode, "localTwoPlayer");
  assert.equal(world.match.playerCount, 2);
}

{
  // Test local mode setup for Player vs AI
  const setup = createDefaultMatchSetup("playerVsAi");
  assert.equal(setup.mode, "playerVsAi");
  assert.equal(setup.players.length, 2);
  assert.equal(setup.players[0]?.controllerKind, "human");
  assert.equal(setup.players[1]?.controllerKind, "ai");
  assert.equal(setup.players[0]?.displayName, "Player 1");
  assert.equal(setup.players[1]?.displayName, "CPU");

  const { world } = createInitialWorld(setup, mockGameContent, {
    width: 960,
    height: 560,
  });
  assert.equal(world.match.mode, "playerVsAi");
  assert.equal(world.match.playerCount, 2);
}

{
  // Test getPlayerMatchConfig helper
  const aiPlayer0 = getPlayerMatchConfig("playerVsAi", 0);
  assert.equal(aiPlayer0.displayName, "Player 1");
  assert.equal(aiPlayer0.controllerKind, "human");

  const aiPlayer1 = getPlayerMatchConfig("playerVsAi", 1);
  assert.equal(aiPlayer1.displayName, "CPU");
  assert.equal(aiPlayer1.controllerKind, "ai");

  const localPlayer0 = getPlayerMatchConfig("localTwoPlayer", 0);
  assert.equal(localPlayer0.displayName, "Player 1");
  assert.equal(localPlayer0.controllerKind, "human");

  const localPlayer1 = getPlayerMatchConfig("localTwoPlayer", 1);
  assert.equal(localPlayer1.displayName, "Player 2");
  assert.equal(localPlayer1.controllerKind, "human");

  const onlinePlayer1 = getPlayerMatchConfig("online", 1);
  assert.equal(onlinePlayer1.displayName, "Player 2");
  assert.equal(onlinePlayer1.controllerKind, "remote");
}
