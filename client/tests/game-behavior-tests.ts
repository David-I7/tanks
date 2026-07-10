import assert from "node:assert/strict";
import { getPlayerMatchConfig } from "../src/game/modes";
import {
  createDefaultMatchSetup,
  createInitialWorld,
} from "../src/game/world/createInitialWorld";
import { LocalSimulationAuthority } from "../src/game/simulation/LocalSimulationAuthority";
import { createMockRemoteTransport } from "../src/game/authority/createMockRemoteTransport";
import {
  createLocalSimulationAuthority,
  createRemoteSimulationAuthority,
  type SimulationAuthority,
} from "../src/game/authority/simulationAuthority";
import { snapshotToGameViewState } from "../src/game/authority/gameAuthority";
import { createWorldSizingPolicy } from "../src/game/world/worldSizing";
import { createWorldStatePublisher } from "../src/game/world/worldStatePublisher";
import { collectPlayerIntents } from "../src/game/input/CanvasInputSource";
import {
  findProjectileSlotAtCanvasPoint,
  getProjectileSelectorLayout,
} from "../src/game/input/projectileSelectorHitTest";
import { TerrainModel } from "../src/game/terrain/TerrainModel";
import {
  mockGameContent,
  type GameContent,
} from "../src/game/content/mockGameContent";
import type { MatchSetup } from "../src/game/types";

function makeAuthority(setup: MatchSetup = createDefaultMatchSetup("localTwoPlayer")) {
  const { world, terrain, content } = createInitialWorld(setup, mockGameContent, 960, 560);
  return new LocalSimulationAuthority(world, terrain, content);
}

function firstTank(authority: LocalSimulationAuthority) {
  const tank = authority.snapshot().tanks.find((entry) => entry.tank.playerId === 0);
  assert.ok(tank);
  return tank;
}

async function expectSharedAuthoritySelection(
  authority: SimulationAuthority,
): Promise<void> {
  const seen: string[] = [];
  const unsubscribe = authority.subscribe((snapshot) => {
    seen.push(snapshot.tanks[0]?.tank.selectedProjectileSlotId ?? "");
  });
  assert.equal(
    authority.submitIntent(0, {
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    true,
  );
  authority.update(0);
  await new Promise((resolve) => setTimeout(resolve, 5));
  unsubscribe();
  authority.destroy();
  assert.ok(seen.includes("mortar"));
}

{
  const authority = makeAuthority();
  const snapshot = authority.snapshot();
  assert.equal(snapshot.tanks.length, 2);
  assert.equal(snapshot.tanks[0]?.tank.tankDefinitionId, "vanguard");
  assert.equal(snapshot.tanks[1]?.tank.tankDefinitionId, "specter");
  assert.equal(snapshot.tanks[0]?.tank.loadout.length, 5);
  assert.equal(snapshot.tanks[0]?.tank.selectedProjectileSlotId, "standard");
  assert.equal(snapshot.terrain.kind, "heightmap");
}

{
  const sizing = createWorldSizingPolicy({
    viewport: { width: 960, height: 560 },
    devicePixelRatio: 2,
  });
  const sameViewportDifferentDpr = createWorldSizingPolicy({
    viewport: { width: 960, height: 560 },
    devicePixelRatio: 3,
  });
  assert.deepEqual(sizing.world, sameViewportDifferentDpr.world);
  assert.deepEqual(sizing.backing, { width: 1920, height: 1120 });

  const first = createInitialWorld(
    createDefaultMatchSetup("localTwoPlayer"),
    mockGameContent,
    sizing.world,
  );
  const second = createInitialWorld(
    createDefaultMatchSetup("localTwoPlayer"),
    mockGameContent,
    sameViewportDifferentDpr.world,
  );
  assert.equal(first.terrain.width, second.terrain.width);
  assert.equal(first.terrain.height, second.terrain.height);
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
        960,
        560,
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
        960,
        560,
      ),
    /exactly five projectile slots/,
  );
}

{
  const authority = makeAuthority();
  const before = firstTank(authority).position.x;
  assert.equal(firstTank(authority).tank.maxFuel, 240);
  authority.submitIntent(0, { type: "move", direction: 1 });
  const after = firstTank(authority).position.x;
  assert.ok(
    after - before <= 3,
    `expected fluid movement step, moved ${after - before}px in one frame`,
  );
  assert.equal(firstTank(authority).tank.fuel, 239);
}

{
  const authority = makeAuthority();
  assert.equal(
    authority.submitIntent(1, {
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    false,
  );
  assert.equal(
    authority.submitIntent(0, {
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    true,
  );
  assert.equal(firstTank(authority).tank.selectedProjectileSlotId, "mortar");
}

{
  await expectSharedAuthoritySelection(
    createLocalSimulationAuthority({
      setup: createDefaultMatchSetup("localTwoPlayer"),
      content: mockGameContent,
      worldSize: { width: 960, height: 560 },
    }),
  );

  await expectSharedAuthoritySelection(
    createRemoteSimulationAuthority(
      createMockRemoteTransport({
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
  const authority = makeAuthority();
  assert.equal(
    authority.submitIntent(0, {
      type: "fire",
      angle: -0.6,
      power: 400,
      projectileSlotId: "heavy",
    }),
    true,
  );
  const snapshot = authority.snapshot();
  assert.equal(snapshot.match.phase, "ballistics");
  assert.equal(snapshot.projectiles[0]?.projectile.projectileDefinitionId, "heavyShell");
  assert.equal(snapshot.projectiles[0]?.projectile.power, 400);
  assert.equal(snapshot.tanks[0]?.tank.selectedProjectileSlotId, "heavy");
  assert.equal(snapshot.projectiles[0]?.projectile.physics.gravityScale, 1.14);
}

{
  const authority = makeAuthority();
  const snapshot = authority.snapshot();
  const slotCount = snapshot.tanks[0]?.tank.loadout.length ?? 0;
  const layout = getProjectileSelectorLayout(960, 560, slotCount);
  const selectedSlot = findProjectileSlotAtCanvasPoint(
    snapshotToGameViewState(snapshot),
    960,
    560,
    layout.x + layout.slotSize + layout.gap + layout.slotSize / 2,
    layout.y + layout.slotSize / 2,
  );
  assert.equal(selectedSlot, "mortar");
}

{
  const authority = makeAuthority();
  authority.submitIntent(0, {
    type: "fire",
    angle: 1.35,
    power: 520,
    projectileSlotId: "cluster",
  });
  for (let i = 0; i < 240 && authority.snapshot().impactEvents.length === 0; i += 1) {
    authority.update(1 / 30);
  }
  const impactSnapshot = authority.snapshot();
  assert.ok(impactSnapshot.impactEvents.length > 0);
  assert.equal(impactSnapshot.impactEvents[0]?.animationId, "spark-burst");
  assert.equal(impactSnapshot.match.phase, "impact");

  for (let i = 0; i < 90 && authority.snapshot().match.phase !== "aiming"; i += 1) {
    authority.update(1 / 30);
  }
  assert.equal(authority.snapshot().match.phase, "aiming");
}

{
  const terrain = new TerrainModel(260, 160);
  const patch = terrain.deform(130, 88, 48);
  assert.equal(patch.kind, "heightmap-range");
  assert.ok(patch.surface.length > 0);
  assert.notEqual(patch.surface, terrain.surface);
  assert.ok(patch.startX >= 0);
  let maxStep = 0;
  for (let x = 82; x <= 178; x += 1) {
    maxStep = Math.max(
      maxStep,
      Math.abs(terrain.getSurfaceY(x) - terrain.getSurfaceY(x - 1)),
    );
  }
  assert.ok(
    maxStep <= 5,
    `expected smoothed crater edge, got adjacent height step ${maxStep}`,
  );
}

{
  const authority = makeAuthority();
  const messages: string[] = [];
  const unsubscribe = authority.subscribeMessages((message) => {
    messages.push(message.type);
  });
  authority.submitIntent(0, {
    type: "fire",
    angle: 1.35,
    power: 520,
    projectileSlotId: "cluster",
  });
  for (let i = 0; i < 240 && !messages.includes("terrainPatch"); i += 1) {
    authority.update(1 / 30);
  }
  unsubscribe();
  assert.ok(messages.includes("terrainPatch"));
}

{
  const publisher = createWorldStatePublisher("test-content");
  const authority = makeAuthority();
  const frame = authority.snapshot();
  const messages = publisher.drain([
    publisher.publishSnapshot(frame),
    publisher.publishFrame(frame),
  ]);
  assert.equal(messages[0]?.type, "snapshot");
  assert.ok(messages[0]?.type === "snapshot" && messages[0].snapshot.projectileDefinitions.basicShell);
  assert.equal(messages[1]?.type, "frame");
  assert.ok(messages[1]?.type === "frame" && !("projectileDefinitions" in messages[1].state));
  assert.ok(messages[1]?.type === "frame" && messages[1].state.contentVersion === "test-content");
}

{
  const authority = makeAuthority();
  const snapshot = authority.snapshot();
  const intents = collectPlayerIntents({
    state: {
      pressedKeys: new Set(["ArrowRight"]),
      pointer: { clientX: 480, clientY: 280 },
      pendingPointerDown: null,
      pendingSlotNumber: 2,
    },
    context: {
      snapshot: snapshotToGameViewState(snapshot),
      cameraX: 0,
      viewport: { width: 960, height: 560 },
      canvasRect: { left: 0, top: 0, width: 960, height: 560 },
    },
  });
  assert.deepEqual(intents[0], { type: "move", direction: 1 });
  assert.deepEqual(intents[1], {
    type: "selectProjectileSlot",
    projectileSlotId: "mortar",
  });
  assert.equal(intents[2]?.type, "aim");
}

{
  const transport = createMockRemoteTransport({
    setup: createDefaultMatchSetup("online"),
    content: mockGameContent,
    width: 960,
    height: 560,
    latencyMs: 0,
  });
  const seen: string[] = [];
  const unsubscribe = transport.onSnapshot((snapshot) => {
    seen.push(snapshot.tanks[0]?.tank.selectedProjectileSlotId ?? "");
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

  const { world } = createInitialWorld(setup, mockGameContent, 960, 560);
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

  const { world } = createInitialWorld(setup, mockGameContent, 960, 560);
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
