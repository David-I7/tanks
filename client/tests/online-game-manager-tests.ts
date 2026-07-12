import assert from "node:assert/strict";

import type {
  OnlineDiffEnvelope,
  OnlineGameStateSnapshot,
  OnlinePlayerIntentEnvelope,
} from "../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createOnlineGameManager,
} from "../src/game/online/OnlineGameManager";
import type { GameManager } from "../src/game";
import type {
  OnlineGameplayTransport,
} from "../src/game/online/OnlineGameplayTransport";

// Online behavior is verified at the shared manager seam: GameAction in and
// cached GameState out.

function onlineState(): OnlineGameStateSnapshot {
  return {
    gameplayDefinitionVersion: "online-gameplay-definitions.v1",
    match: {
      phase: "AIMING",
      activePlayerId: 1,
      playerCount: 2,
      turnNumber: 1,
      turnTimeRemainingTicks: 900,
      winnerPlayerId: null,
    },
    terrain: {
      kind: "HEIGHTMAP",
      width: 4,
      height: 3,
      surface: [2, 2, 1, 2],
    },
    tanks: [
      {
        entityId: 10,
        playerId: 1,
        displayName: "Player 1",
        tankDefinitionId: "vanguard",
        renderAssetId: "tank.vanguard",
        position: { x: 50, y: 120 },
        facing: 1,
        aimAngle: 45,
        power: 0.5,
        selectedProjectileSlotId: "standard",
        loadout: [
          {
            id: "standard",
            projectileDefinitionId: "basicShell",
            label: "Std",
            renderAssetId: "projectile-slot.standard",
          },
        ],
        health: 110,
        maxHealth: 110,
        fuel: 100,
        alive: true,
      },
      {
        entityId: 20,
        playerId: 2,
        displayName: "Player 2",
        tankDefinitionId: "specter",
        renderAssetId: "tank.specter",
        position: { x: 150, y: 120 },
        facing: -1,
        aimAngle: 135,
        power: 0.5,
        selectedProjectileSlotId: "standard",
        loadout: [
          {
            id: "standard",
            projectileDefinitionId: "basicShell",
            label: "Std",
            renderAssetId: "projectile-slot.standard",
          },
        ],
        health: 94,
        maxHealth: 94,
        fuel: 100,
        alive: true,
      },
    ],
    projectiles: [
      {
        entityId: 99,
        ownerPlayerId: 1,
        projectileDefinitionId: "basicShell",
        renderAssetId: "projectile.basic",
        position: { x: 75, y: 110 },
        velocity: { x: 1, y: -2 },
      },
    ],
  };
}

function initialDiff(sequence = 1): OnlineDiffEnvelope {
  return {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence,
    serverTick: 0,
    type: "INITIAL_STATE",
    intentId: null,
    payload: {
      expectedNextDiffSequence: sequence + 1,
      localPlayerId: 1,
      state: onlineState(),
    },
  };
}

function movementDiff(sequence = 2): OnlineDiffEnvelope {
  return {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence,
    serverTick: 30,
    type: "MOVEMENT_SEGMENT",
    intentId: "intent-move",
    payload: {
      intentId: "intent-move",
      playerId: 1,
      tankEntityId: 10,
      from: { x: 50, y: 120 },
      to: { x: 55, y: 120 },
      fuelBefore: 100,
      fuelAfter: 95,
      fuelSpent: 5,
      startedServerTick: 30,
      endedServerTick: 45,
      durationTicks: 15,
    },
  };
}

function createTransport(): {
  emit(diff: OnlineDiffEnvelope): void;
  resyncRequests: number;
  sentIntents: OnlinePlayerIntentEnvelope[];
  transport: OnlineGameplayTransport;
} {
  let listener: ((diff: OnlineDiffEnvelope) => void) | null = null;
  let resyncRequests = 0;
  const sentIntents: OnlinePlayerIntentEnvelope[] = [];

  return {
    emit(diff: OnlineDiffEnvelope): void {
      listener?.(diff);
    },
    get resyncRequests(): number {
      return resyncRequests;
    },
    sentIntents,
    transport: {
      sendPlayerIntent(intent): void {
        sentIntents.push(intent);
      },
      requestResyncState(): void {
        resyncRequests += 1;
      },
      subscribeToStateDiffs(nextListener): () => void {
        listener = nextListener;
        return () => {
          listener = null;
        };
      },
      subscribeToGameEvents(): () => void {
        return () => {};
      },
      destroy(): void {
        listener = null;
      },
    },
  };
}

{
  const test = createTransport();
  const gameManager: GameManager = createOnlineGameManager({
    transport: test.transport,
  });
  const seen: number[] = [];

  gameManager.subscribe((state) => {
    seen.push(state.tanks[0]?.position.x ?? Number.NaN);
  });

  test.emit(initialDiff());
  test.emit(movementDiff(4));

  assert.deepEqual(seen, [50, 50]);
  assert.equal(test.resyncRequests, 1);
  test.emit({
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 4,
    serverTick: 120,
    type: "RESYNC_STATE",
    intentId: null,
    payload: {
      replacesSequence: 4,
      reason: "MISSED_DIFF",
      localPlayerId: 1,
      state: {
        ...onlineState(),
        tanks: [
          {
            ...onlineState().tanks[0]!,
            position: { x: 70, y: 120 },
            fuel: 85,
          },
          onlineState().tanks[1]!,
        ],
      },
    },
  });
  assert.equal(gameManager.getState().tanks[0]?.position.x, 70);
  gameManager.destroy();
}

{
  const test = createTransport();
  let now = 0;
  const gameManager: GameManager = createOnlineGameManager({
    transport: test.transport,
    intentIdFactory: () => "intent-move",
    monotonicNowMs: () => now,
  });
  const seenTankX: number[] = [];

  gameManager.subscribe((state) => {
    seenTankX.push(state.tanks[0]?.position.x ?? Number.NaN);
  });

  assert.throws(() => gameManager.getState(), /Initial State/);
  test.emit(initialDiff());

  const initialized = gameManager.getState();
  assert.equal(gameManager.getState(), initialized);
  assert.equal(initialized.match.mode, "online");
  assert.equal(initialized.match.phase, "aiming");
  assert.equal(initialized.tanks[0]?.controllerKind, "human");
  assert.equal(initialized.tanks[1]?.controllerKind, "remote");

  assert.equal(gameManager.submitAction({ type: "move", direction: 1 }), true);
  assert.deepEqual(test.sentIntents[0], {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    playerId: 1,
    intentId: "intent-move",
    lastConfirmedDiffSequence: 1,
    lastConfirmedDiffServerTick: 0,
    type: "MOVE",
    payload: { direction: 1 },
  });
  assert.equal(gameManager.getState().tanks[0]?.position.x, 51);
  assert.ok(seenTankX.includes(51));

  now = 1000;
  test.emit(movementDiff());
  now = 1600;
  gameManager.update(0);

  assert.equal(gameManager.getState().tanks[0]?.position.x, 55);
  gameManager.destroy();
}

{
  const test = createTransport();
  const gameManager: GameManager = createOnlineGameManager({
    transport: test.transport,
    monotonicNowMs: () => 1000,
  });

  test.emit(initialDiff());
  test.emit({
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 30,
    type: "PROJECTILE_RESOLUTION",
    intentId: "intent-fire",
    payload: {
      intentId: "intent-fire",
      projectileEntityId: 99,
      ownerPlayerId: 1,
      projectileDefinitionId: "basicShell",
      projectileRenderAssetId: "projectile.basic",
      impactRenderAssetId: "impact.small",
      launch: { x: 50, y: 120 },
      trajectory: [
        { x: 50, y: 120 },
        { x: 150, y: 120 },
      ],
      impact: { x: 150, y: 120 },
      damagedTanks: [
        {
          tankEntityId: 20,
          playerId: 2,
          damage: 44,
          remainingHealth: 50,
        },
      ],
    },
  });
  assert.equal(gameManager.getState().projectiles.length, 0);
  assert.equal(gameManager.getState().impactEvents.length, 1);
  assert.equal(gameManager.getState().impactEvents[0]?.position.x, 150);
  assert.equal(gameManager.getState().tanks[1]?.health, 50);

  test.emit({
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 3,
    serverTick: 60,
    type: "TERRAIN_PATCH",
    intentId: null,
    payload: {
      patches: [{ kind: "HEIGHTMAP_RANGE", startX: 1, surface: [0, 1] }],
    },
  });
  assert.deepEqual(
    gameManager.getState().terrain.kind === "heightmap"
      ? gameManager.getState().terrain.surface
      : [],
    [2, 0, 1, 2],
  );

  test.emit({
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 4,
    serverTick: 90,
    type: "TURN_TRANSITION",
    intentId: null,
    payload: {
      previousPlayerId: 1,
      activePlayerId: 2,
      turnNumber: 2,
      phase: "AIMING",
      turnEndsAtServerTick: 990,
    },
  });
  assert.equal(gameManager.getState().match.activePlayerId, 2);
  assert.equal(gameManager.getState().match.turnNumber, 2);

  test.emit({
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 5,
    serverTick: 120,
    type: "TERMINAL_GAME",
    intentId: null,
    payload: {
      winnerPlayerId: 1,
      reason: "LAST_TANK_STANDING",
      finalState: {
        ...onlineState(),
        match: {
          ...onlineState().match,
          phase: "GAME_OVER",
          winnerPlayerId: 1,
        },
      },
    },
  });
  assert.equal(gameManager.getState().match.phase, "gameOver");
  assert.equal(gameManager.getState().match.winnerPlayerId, 1);
  gameManager.destroy();
}

{
  const test = createTransport();
  const gameManager: GameManager = createOnlineGameManager({
    transport: test.transport,
    intentIdFactory: () => "intent-rejected",
    monotonicNowMs: () => 0,
  });

  test.emit(initialDiff());
  assert.equal(gameManager.submitAction({ type: "move", direction: 1 }), true);
  assert.equal(gameManager.getState().tanks[0]?.position.x, 51);

  test.emit({
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 30,
    type: "INTENT_REJECTION",
    intentId: "intent-rejected",
    payload: {
      rejectedIntentId: "intent-rejected",
      playerId: 1,
      reason: "INSUFFICIENT_FUEL",
      authoritativeSequence: 2,
      authoritativeServerTick: 30,
    },
  });

  assert.equal(gameManager.getState().tanks[0]?.position.x, 50);
  gameManager.destroy();
}

{
  const test = createTransport();
  const gameManager: GameManager = createOnlineGameManager({
    transport: test.transport,
    intentIdFactory: () => "intent-fire",
  });

  test.emit(initialDiff());
  assert.equal(
    gameManager.submitAction({
      type: "fire",
      angle: 42,
      power: 0.75,
      projectileSlotId: "standard",
    }),
    true,
  );

  assert.deepEqual(test.sentIntents[0], {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    playerId: 1,
    intentId: "intent-fire",
    lastConfirmedDiffSequence: 1,
    lastConfirmedDiffServerTick: 0,
    type: "FIRE",
    payload: {
      angle: 42,
      power: 0.75,
      projectileSlotId: "standard",
    },
  });
  gameManager.destroy();
}
