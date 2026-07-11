import assert from "node:assert/strict";

import {
  OnlineDiffSequenceError,
  applyOnlineStateDiff,
  initializeOnlineConfirmedState,
  initializeOnlineConfirmedStateFromResync,
  predictOnlineMovement,
  type OnlineConfirmedState,
} from "../src/game/online/onlineConfirmedState";
import type {
  OnlineDiffEnvelope,
  OnlineInitialStateDiff,
  OnlineIntentRejectionDiff,
  OnlineMovementSegmentDiff,
  OnlineResyncStateDiff,
} from "../src/api/ws/dto/gameplay/onlineGameplayProtocol";

const initialStateDiff = {
  protocolVersion: "online-gameplay.v1",
  gameSessionId: "game-123",
  sequence: 1,
  serverTick: 0,
  type: "INITIAL_STATE",
  intentId: null,
  payload: {
    expectedNextDiffSequence: 2,
    localPlayerId: 2,
    state: {
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
      ],
      projectiles: [],
    },
  },
} satisfies OnlineDiffEnvelope<OnlineInitialStateDiff>;

const confirmed: OnlineConfirmedState = initializeOnlineConfirmedState(initialStateDiff);

assert.equal(confirmed.gameSessionId, "game-123");
assert.equal(confirmed.localPlayerId, 2);
assert.equal(confirmed.lastConfirmedDiffSequence, 1);
assert.equal(confirmed.lastConfirmedDiffServerTick, 0);
assert.equal(confirmed.expectedNextDiffSequence, 2);
assert.equal(confirmed.pendingPredictions.length, 0);
assert.equal(confirmed.state.gameplayDefinitionVersion, "online-gameplay-definitions.v1");
assert.equal(confirmed.state.match.activePlayerId, 1);
assert.equal(confirmed.state.tanks[0]?.loadout[0]?.projectileDefinitionId, "basicShell");

const resyncStateDiff = {
  protocolVersion: "online-gameplay.v1",
  gameSessionId: "game-123",
  sequence: 7,
  serverTick: 120,
  type: "RESYNC_STATE",
  intentId: null,
  payload: {
    replacesSequence: 7,
    reason: "RECONNECT",
    localPlayerId: 2,
    state: {
      ...initialStateDiff.payload.state,
      tanks: [
        {
          ...initialStateDiff.payload.state.tanks[0]!,
          position: { x: 70, y: 120 },
          fuel: 85,
        },
      ],
    },
  },
} satisfies OnlineDiffEnvelope<OnlineResyncStateDiff>;

const confirmedFromResync = initializeOnlineConfirmedStateFromResync(resyncStateDiff);

assert.equal(confirmedFromResync.lastConfirmedDiffSequence, 7);
assert.equal(confirmedFromResync.localPlayerId, 2);
assert.equal(confirmedFromResync.expectedNextDiffSequence, 8);
assert.equal(confirmedFromResync.resyncStatus.kind, "READY");
assert.equal(confirmedFromResync.resyncStatus.lastResyncSequence, 7);
assert.equal(confirmedFromResync.pendingPredictions.length, 0);
assert.equal(confirmedFromResync.state.tanks[0]?.position.x, 70);

const confirmedWithPrediction: OnlineConfirmedState = {
  ...confirmed,
  resyncStatus: { kind: "READY", lastResyncSequence: null },
  pendingPredictions: [
    {
      intentId: "intent-stale",
      baseDiffSequence: 1,
      baseDiffServerTick: 0,
    },
  ],
};

const rejectionDiff = {
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
    authoritativeSequence: 3,
    authoritativeServerTick: 30,
  },
} satisfies OnlineDiffEnvelope<OnlineIntentRejectionDiff>;

const afterRejection = applyOnlineStateDiff(confirmedWithPrediction, rejectionDiff);

assert.equal(afterRejection.lastConfirmedDiffSequence, 2);
assert.equal(afterRejection.lastConfirmedDiffServerTick, 30);
assert.equal(afterRejection.expectedNextDiffSequence, 3);
assert.equal(afterRejection.pendingPredictions.length, 0);

const confirmedWithMovePrediction = predictOnlineMovement(confirmed, "intent-move", 1, { direction: 1 });

assert.equal(confirmedWithMovePrediction.pendingPredictions.length, 1);
assert.equal(confirmedWithMovePrediction.pendingPredictions[0]?.baseDiffSequence, 1);
assert.equal(confirmedWithMovePrediction.pendingPredictions[0]?.baseDiffServerTick, 0);
assert.equal(confirmedWithMovePrediction.pendingPredictions[0]?.predictedMovement?.to.x, 51);
assert.equal(confirmedWithMovePrediction.pendingPredictions[0]?.predictedMovement?.fuelAfter, 99);

const movementDiff = {
  protocolVersion: "online-gameplay.v1",
  gameSessionId: "game-123",
  sequence: 2,
  serverTick: 60,
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
    startedServerTick: 60,
    endedServerTick: 75,
    durationTicks: 15,
  },
} satisfies OnlineDiffEnvelope<OnlineMovementSegmentDiff>;

const afterMovement = applyOnlineStateDiff(confirmedWithMovePrediction, movementDiff, () => 1234);

assert.equal(afterMovement.pendingPredictions.length, 0);
assert.equal(afterMovement.state.tanks[0]?.position.x, 55);
assert.equal(afterMovement.state.tanks[0]?.fuel, 95);
assert.equal(afterMovement.confirmedMovementSegments.length, 1);
assert.equal(afterMovement.confirmedMovementSegments[0]?.receivedAtMonotonicMs, 1234);
assert.equal(afterMovement.confirmedMovementSegments[0]?.durationMs, 500);

const skippedDiff = {
  ...rejectionDiff,
  sequence: 4,
} satisfies OnlineDiffEnvelope<OnlineIntentRejectionDiff>;

assert.throws(
  () => applyOnlineStateDiff(confirmed, skippedDiff),
  (error) =>
    error instanceof OnlineDiffSequenceError &&
    error.kind === "MISSING_DIFF" &&
    error.expectedSequence === 2 &&
    error.receivedSequence === 4,
);

const staleDiff = {
  ...rejectionDiff,
  sequence: 1,
} satisfies OnlineDiffEnvelope<OnlineIntentRejectionDiff>;

assert.throws(
  () => applyOnlineStateDiff(confirmed, staleDiff),
  (error) =>
    error instanceof OnlineDiffSequenceError &&
    error.kind === "OUT_OF_ORDER_DIFF" &&
    error.expectedSequence === 2 &&
    error.receivedSequence === 1,
);
