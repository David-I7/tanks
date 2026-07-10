import assert from "node:assert/strict";

import type {
  OnlineDiffEnvelope,
  OnlineGameStateSnapshot,
  OnlineInitialStateDiff,
  OnlineIntentRejectionDiff,
  OnlineMovementSegmentDiff,
  OnlineProjectileResolutionDiff,
  OnlineResyncStateDiff,
  OnlineTerrainPatchDiff,
  OnlineTurnTransitionDiff,
} from "../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  OnlineDiffSequenceError,
  applyOnlineStateDiff,
  initializeOnlineConfirmedState,
  predictOnlineMovement,
  projectOnlineRenderState,
  requestOnlineResyncState,
} from "../src/game/online/onlineConfirmedState";

function initialState(): OnlineGameStateSnapshot {
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
      width: 6,
      height: 3,
      surface: [2, 2, 1, 2, 2, 2],
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
        health: 100,
        maxHealth: 100,
        fuel: 100,
        alive: true,
      },
    ],
    projectiles: [],
  };
}

function initialDiff() {
  return {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 1,
    serverTick: 0,
    type: "INITIAL_STATE",
    intentId: null,
    payload: {
      expectedNextDiffSequence: 2,
      state: initialState(),
    },
  } satisfies OnlineDiffEnvelope<OnlineInitialStateDiff>;
}

function movementDiff(
  overrides: Partial<OnlineDiffEnvelope<OnlineMovementSegmentDiff>> & {
    payload?: Partial<OnlineMovementSegmentDiff["payload"]>;
  } = {},
): OnlineDiffEnvelope<OnlineMovementSegmentDiff> {
  return {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 30,
    type: "MOVEMENT_SEGMENT",
    intentId: null,
    ...overrides,
    payload: {
      intentId: "movement",
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
      ...overrides.payload,
    },
  };
}

function resyncDiff(
  overrides: Partial<OnlineDiffEnvelope<OnlineResyncStateDiff>> & {
    payload?: Partial<OnlineResyncStateDiff["payload"]> & {
      state?: Partial<OnlineGameStateSnapshot>;
    };
  } = {},
): OnlineDiffEnvelope<OnlineResyncStateDiff> {
  return {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 5,
    serverTick: 150,
    type: "RESYNC_STATE",
    intentId: null,
    ...overrides,
    payload: {
      replacesSequence: 5,
      reason: "MISSED_DIFF",
      state: initialState(),
      ...overrides.payload,
      state: {
        ...initialState(),
        ...overrides.payload?.state,
      },
    },
  };
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());

  assert.equal(confirmed.expectedNextDiffSequence, 2);
  assert.equal(confirmed.state.tanks[0]?.position.x, 50);
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const movement = movementDiff({
    payload: {
      intentId: "opponent-intent",
      playerId: 2,
      tankEntityId: 20,
      from: { x: 150, y: 120 },
      to: { x: 145, y: 120 },
      fuelBefore: 100,
      fuelAfter: 95,
      fuelSpent: 5,
      startedServerTick: 30,
      endedServerTick: 45,
      durationTicks: 15,
    },
  });

  const afterMovement = applyOnlineStateDiff(confirmed, movement, () => 1000);

  assert.equal(afterMovement.expectedNextDiffSequence, 3);
  assert.equal(afterMovement.state.tanks[1]?.position.x, 145);
  assert.equal(afterMovement.confirmedMovementSegments[0]?.durationMs, 500);
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());

  assert.throws(
    () =>
      applyOnlineStateDiff(confirmed, {
        ...initialDiff(),
        sequence: 4,
      }),
    (error) =>
      error instanceof OnlineDiffSequenceError &&
      error.kind === "MISSING_DIFF" &&
      error.expectedSequence === 2 &&
      error.receivedSequence === 4,
  );
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const predicted = predictOnlineMovement(confirmed, "intent-move", 1, { direction: 1 });
  const acceptedMovement = movementDiff({
    intentId: "intent-move",
    payload: {
      intentId: "intent-move",
      playerId: 1,
      tankEntityId: 10,
      from: { x: 50, y: 120 },
      to: { x: 53, y: 120 },
      fuelBefore: 100,
      fuelAfter: 97,
      fuelSpent: 3,
      startedServerTick: 30,
      endedServerTick: 39,
      durationTicks: 9,
    },
  });

  const afterAccepted = applyOnlineStateDiff(predicted, acceptedMovement, () => 2000);

  assert.equal(afterAccepted.pendingPredictions.length, 0);
  assert.equal(afterAccepted.state.tanks[0]?.position.x, 53);
  assert.equal(afterAccepted.state.tanks[0]?.fuel, 97);
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const predicted = predictOnlineMovement(confirmed, "intent-stale", 1, { direction: 1 });
  const rejection = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 30,
    type: "INTENT_REJECTION",
    intentId: "intent-stale",
    payload: {
      rejectedIntentId: "intent-stale",
      playerId: 1,
      reason: "STALE_BASE_STATE",
      authoritativeSequence: 2,
      authoritativeServerTick: 30,
    },
  } satisfies OnlineDiffEnvelope<OnlineIntentRejectionDiff>;

  const afterRejected = applyOnlineStateDiff(predicted, rejection);
  const renderState = projectOnlineRenderState(afterRejected, 0);

  assert.equal(afterRejected.pendingPredictions.length, 0);
  assert.equal(renderState.tanks[0]?.position.x, 50);
  assert.equal(renderState.tanks[0]?.fuel, 100);
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const predicted = predictOnlineMovement(confirmed, "intent-local", 1, { direction: 1 });
  const opponentAccepted = movementDiff({
    intentId: "intent-local",
    payload: {
      intentId: "intent-local",
      playerId: 2,
      tankEntityId: 20,
      from: { x: 150, y: 120 },
      to: { x: 145, y: 120 },
      fuelBefore: 100,
      fuelAfter: 95,
      fuelSpent: 5,
      startedServerTick: 30,
      endedServerTick: 45,
      durationTicks: 15,
    },
  });

  const afterOpponentAccepted = applyOnlineStateDiff(predicted, opponentAccepted);

  assert.equal(afterOpponentAccepted.pendingPredictions.length, 1);
  assert.equal(afterOpponentAccepted.pendingPredictions[0]?.intentId, "intent-local");
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const predicted = predictOnlineMovement(confirmed, "intent-local", 1, { direction: 1 });
  const renderState = projectOnlineRenderState(predicted, 0);

  assert.equal(predicted.state.tanks[0]?.position.x, 50);
  assert.equal(renderState.tanks[0]?.position.x, 51);
  assert.equal(renderState.tanks[0]?.fuel, 99);
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const movement = movementDiff({
    payload: {
      intentId: "movement",
      playerId: 1,
      tankEntityId: 10,
      from: { x: 50, y: 120 },
      to: { x: 80, y: 120 },
      fuelBefore: 100,
      fuelAfter: 70,
      fuelSpent: 30,
      startedServerTick: 30,
      endedServerTick: 60,
      durationTicks: 30,
    },
  });

  const afterMovement = applyOnlineStateDiff(confirmed, movement, () => 1000);
  const interpolated = projectOnlineRenderState(afterMovement, 1500);

  assert.equal(interpolated.tanks[0]?.position.x, 65);
  assert.equal(interpolated.tanks[0]?.fuel, 85);
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const firstPrediction = predictOnlineMovement(confirmed, "intent-one", 1, { direction: 1 });
  const secondPrediction = predictOnlineMovement(firstPrediction, "intent-two", 1, { direction: -1 });

  assert.equal(secondPrediction.pendingPredictions.length, 1);
  assert.equal(secondPrediction.pendingPredictions[0]?.intentId, "intent-two");
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const predicted = predictOnlineMovement(confirmed, "intent-before-resync", 1, { direction: 1 });
  const resync = resyncDiff({
    sequence: 9,
    serverTick: 270,
    payload: {
      replacesSequence: 9,
      state: {
        tanks: [
          {
            ...initialState().tanks[0]!,
            position: { x: 75, y: 120 },
            fuel: 80,
          },
          initialState().tanks[1]!,
        ],
      },
    },
  });

  const afterResync = applyOnlineStateDiff(predicted, resync);

  assert.equal(afterResync.pendingPredictions.length, 0);
  assert.equal(afterResync.expectedNextDiffSequence, 10);
  assert.equal(afterResync.resyncStatus.kind, "READY");
  assert.equal(afterResync.resyncStatus.lastResyncSequence, 9);
  assert.equal(afterResync.state.tanks[0]?.position.x, 75);
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const waitingForResync = requestOnlineResyncState(confirmed);
  const staleLiveDiff = movementDiff({
    sequence: 2,
    payload: {
      to: { x: 60, y: 120 },
      fuelAfter: 90,
    },
  });

  const afterStaleLiveDiff = applyOnlineStateDiff(waitingForResync, staleLiveDiff);

  assert.equal(afterStaleLiveDiff.resyncStatus.kind, "REQUESTED");
  assert.equal(afterStaleLiveDiff.expectedNextDiffSequence, 2);
  assert.equal(afterStaleLiveDiff.state.tanks[0]?.position.x, 50);
  assert.equal(afterStaleLiveDiff.state.tanks[0]?.fuel, 100);
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const waitingForResync = requestOnlineResyncState(confirmed);
  const resync = resyncDiff({
    payload: {
      reason: "RECONNECT",
      state: {
        tanks: [
          {
            ...initialState().tanks[0]!,
            position: { x: 70, y: 120 },
            fuel: 85,
          },
          initialState().tanks[1]!,
        ],
      },
    },
  });
  const liveAfterResync = movementDiff({
    sequence: 6,
    serverTick: 180,
    payload: {
      from: { x: 70, y: 120 },
      to: { x: 72, y: 120 },
      fuelBefore: 85,
      fuelAfter: 83,
      fuelSpent: 2,
      startedServerTick: 180,
      endedServerTick: 195,
    },
  });

  const afterResync = applyOnlineStateDiff(waitingForResync, resync);
  const afterLiveDiff = applyOnlineStateDiff(afterResync, liveAfterResync);

  assert.equal(afterResync.expectedNextDiffSequence, 6);
  assert.equal(afterLiveDiff.expectedNextDiffSequence, 7);
  assert.equal(afterLiveDiff.state.tanks[0]?.position.x, 72);
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const waitingForResync = requestOnlineResyncState(confirmed);
  const resync = resyncDiff({
    payload: {
      state: {
        tanks: [
          {
            ...initialState().tanks[0]!,
            position: { x: 70, y: 120 },
            fuel: 85,
          },
          initialState().tanks[1]!,
        ],
      },
    },
  });
  const latePreResyncDiff = movementDiff({
    sequence: 4,
    payload: {
      to: { x: 60, y: 120 },
      fuelAfter: 90,
    },
  });

  const afterResync = applyOnlineStateDiff(waitingForResync, resync);
  const afterLatePreResyncDiff = applyOnlineStateDiff(afterResync, latePreResyncDiff);

  assert.equal(afterLatePreResyncDiff.expectedNextDiffSequence, 6);
  assert.equal(afterLatePreResyncDiff.state.tanks[0]?.position.x, 70);
  assert.equal(afterLatePreResyncDiff.state.tanks[0]?.fuel, 85);
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const projectileResolution = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 30,
    type: "PROJECTILE_RESOLUTION",
    intentId: "fire-intent",
    payload: {
      intentId: "fire-intent",
      projectileEntityId: 99,
      ownerPlayerId: 1,
      projectileDefinitionId: "basicShell",
      projectileRenderAssetId: "projectile.basic",
      impactRenderAssetId: "impact.small",
      launch: { x: 50, y: 120 },
      impact: { x: 150, y: 120 },
      damagedTanks: [
        {
          tankEntityId: 20,
          playerId: 2,
          damage: 45,
          remainingHealth: 55,
        },
      ],
    },
  } satisfies OnlineDiffEnvelope<OnlineProjectileResolutionDiff>;

  const afterProjectile = applyOnlineStateDiff(confirmed, projectileResolution);

  assert.equal(afterProjectile.state.tanks[1]?.health, 55);
  assert.equal(afterProjectile.state.tanks[1]?.alive, true);
}

{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const patch = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 30,
    type: "TERRAIN_PATCH",
    intentId: null,
    payload: {
      patches: [
        {
          kind: "HEIGHTMAP_RANGE",
          startX: 2,
          surface: [0, 1],
        },
      ],
    },
  } satisfies OnlineDiffEnvelope<OnlineTerrainPatchDiff>;
  const turn = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 3,
    serverTick: 60,
    type: "TURN_TRANSITION",
    intentId: null,
    payload: {
      previousPlayerId: 1,
      activePlayerId: 2,
      turnNumber: 2,
      phase: "AIMING",
      turnEndsAtServerTick: 960,
    },
  } satisfies OnlineDiffEnvelope<OnlineTurnTransitionDiff>;

  const afterPatch = applyOnlineStateDiff(confirmed, patch);
  const afterTurn = applyOnlineStateDiff(afterPatch, turn);

  assert.deepEqual(
    afterTurn.state.terrain.kind === "HEIGHTMAP" ? afterTurn.state.terrain.surface : [],
    [2, 2, 0, 1, 2, 2],
  );
  assert.equal(afterTurn.state.match.activePlayerId, 2);
  assert.equal(afterTurn.state.match.turnNumber, 2);
}
