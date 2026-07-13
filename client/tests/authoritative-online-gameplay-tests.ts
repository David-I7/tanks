import assert from "node:assert/strict";
import type { OnlineDiffResponseDto, OnlineInitialStateResponse, OnlineIntentRejectionResponse, OnlineMovementSegmentResponse, OnlineProjectileResolutionResponse, OnlineResyncStateResponse, OnlineTerrainPatchResponse } from "../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import { OnlineDiffSequenceError, applyOnlineStateDiffResponse, initializeOnlineConfirmedState, predictOnlineMovement, projectOnlineRenderState, requestOnlineResyncState } from "../src/game/online/onlineConfirmedState";

const surface = Array.from({ length: 100 }, () => 40);
surface[21] = 39;
surface[22] = 38;
surface[23] = 37;
const initial = {
  protocolVersion: "online-gameplay.v1", gameSessionId: "game", sequence: 1, serverTick: 0,
  type: "INITIAL_STATE", intentId: null,
  payload: { expectedNextDiffSequence: 2, localPlayerId: 1, state: {
    gameContentVersion: "game-content.v1",
    gameContent: {
      version: "game-content.v1",
      world: { width: 100, height: 60, bedrockDepth: 5, tickRateHz: 30, gravity: 500,
        projectileTimeStepSeconds: 1 / 30, maxProjectileSteps: 180, movementSegmentDurationTicks: 6,
        playerASpawnRegion: { minX: 10, maxX: 30 }, playerBSpawnRegion: { minX: 70, maxX: 90 } },
      tanks: { vanguard: { id: "vanguard", name: "Vanguard", renderAssetId: "tank.vanguard",
        maxHealth: 110, maxFuel: 100, movementQuantum: 3, fuelRate: 1, climbCapability: 5,
        collisionRadius: 8, halfWidth: 2, trackGroundOffset: 0, muzzleForwardOffset: 4,
        muzzleVerticalOffset: 4, loadout: [] } },
      projectiles: {},
    },
    match: { phase: "AIMING", activePlayerId: 1, playerCount: 2, turnNumber: 1,
      turnTimeRemainingTicks: 900, winnerPlayerId: null },
    terrain: { kind: "HEIGHTMAP", width: 100, height: 60, surface },
    tanks: [{ entityId: 10, playerId: 1, displayName: "A", tankDefinitionId: "vanguard",
      renderAssetId: "tank.vanguard", position: { x: 20, y: 40 }, facing: 1, aimAngle: 45,
      power: .5, selectedProjectileSlotId: "standard", loadout: [], health: 110, maxHealth: 110,
      fuel: 100, alive: true }], projectiles: [],
  } },
} satisfies OnlineDiffResponseDto<OnlineInitialStateResponse>;

const confirmed = initializeOnlineConfirmedState(initial);
const predicted = predictOnlineMovement(confirmed, "move", 1, { direction: 1 });
assert.deepEqual(predicted.pendingPredictions[0]?.predictedMovement?.movementPath, [
  { x: 20, y: 40 }, { x: 21, y: 39 }, { x: 22, y: 38 }, { x: 23, y: 37 },
]);
assert.equal(predicted.pendingPredictions[0]?.predictedMovement?.fuelAfter, 94);

const movement = {
  protocolVersion: "online-gameplay.v1", gameSessionId: "game", sequence: 2, serverTick: 6,
  type: "MOVEMENT_SEGMENT", intentId: "move", payload: {
    intentId: "move", playerId: 1, tankEntityId: 10, from: { x: 20, y: 40 }, to: { x: 23, y: 37 },
    movementPath: [{ x: 20, y: 40 }, { x: 21, y: 39 }, { x: 22, y: 38 }, { x: 23, y: 37 }],
    fuelBefore: 100, fuelAfter: 94, fuelSpent: 6, partial: false,
    startedServerTick: 0, endedServerTick: 6, durationTicks: 6,
  },
} satisfies OnlineDiffResponseDto<OnlineMovementSegmentResponse>;
const reconciled = applyOnlineStateDiffResponse(predicted, movement, () => 1000);
assert.equal(reconciled.pendingPredictions.length, 0);
assert.deepEqual(projectOnlineRenderState(reconciled, 1100).tanks[0]?.position, { x: 21.5, y: 38.5 });

const projectile = {
  protocolVersion: "online-gameplay.v1", gameSessionId: "game", sequence: 3, serverTick: 6,
  type: "PROJECTILE_RESOLUTION", intentId: "fire", payload: {
    intentId: "fire", projectileEntityId: 20, ownerPlayerId: 1,
    projectileDefinitionId: "basicShell", projectileRenderAssetId: "projectile.basic-shell",
    impactRenderAssetId: "impact.orange-pop", launch: { x: 23, y: 37 },
    trajectory: [{ x: 23, y: 37 }, { x: 23, y: 50 }], impact: { x: 23, y: 50 }, damagedTanks: [],
  },
} satisfies OnlineDiffResponseDto<OnlineProjectileResolutionResponse>;
const resolvedProjectile = applyOnlineStateDiffResponse(reconciled, projectile);
assert.equal(resolvedProjectile.impactEvents.at(-1)?.projectileDefinitionId, "basicShell");

const patch = {
  protocolVersion: "online-gameplay.v1", gameSessionId: "game", sequence: 4, serverTick: 6,
  type: "TERRAIN_PATCH", intentId: null,
  payload: { patches: [{ kind: "HEIGHTMAP_RANGE", startX: 21, surface: [45, 46, 50] }] },
} satisfies OnlineDiffResponseDto<OnlineTerrainPatchResponse>;
const patched = applyOnlineStateDiffResponse(resolvedProjectile, patch);
assert.deepEqual(patched.state.terrain.surface.slice(21, 24), [45, 46, 50]);

const settlement = {
  protocolVersion: "online-gameplay.v1", gameSessionId: "game", sequence: 5, serverTick: 6,
  type: "MOVEMENT_SEGMENT", intentId: null, payload: {
    intentId: null, playerId: 1, tankEntityId: 10, from: { x: 23, y: 37 }, to: { x: 23, y: 50 },
    movementPath: [{ x: 23, y: 37 }, { x: 23, y: 50 }], fuelBefore: 94, fuelAfter: 94,
    fuelSpent: 0, partial: false, startedServerTick: 6, endedServerTick: 12, durationTicks: 6,
  },
} satisfies OnlineDiffResponseDto<OnlineMovementSegmentResponse>;
const settled = applyOnlineStateDiffResponse(patched, settlement, () => 1200);
assert.deepEqual(settled.state.tanks[0]?.position, { x: 23, y: 50 });
assert.equal(settled.state.tanks[0]?.fuel, 94);

const missed = {
  protocolVersion: "online-gameplay.v1", gameSessionId: "game", sequence: 7, serverTick: 12,
  type: "INTENT_REJECTION", intentId: "missed", payload: { rejectedIntentId: "missed", playerId: 1,
    reason: "STALE_BASE_STATE", authoritativeSequence: 6, authoritativeServerTick: 12 },
} satisfies OnlineDiffResponseDto<OnlineIntentRejectionResponse>;
assert.throws(() => applyOnlineStateDiffResponse(settled, missed), OnlineDiffSequenceError);
const awaitingResync = requestOnlineResyncState(settled);
assert.equal(applyOnlineStateDiffResponse(awaitingResync, { ...patch, sequence: 6 }).lastConfirmedDiffSequence, 5);

const recoveredSurface = [...settled.state.terrain.surface];
recoveredSurface[23] = 50;
const resync = {
  protocolVersion: "online-gameplay.v1", gameSessionId: "game", sequence: 7, serverTick: 12,
  type: "RESYNC_STATE", intentId: null, payload: { replacesSequence: 7, reason: "RECONNECT", localPlayerId: 1,
    state: { ...settled.state, terrain: { ...settled.state.terrain, surface: recoveredSurface }, tanks: [
      { ...settled.state.tanks[0]!, position: { x: 23, y: 50 }, fuel: 94 },
    ] } },
} satisfies OnlineDiffResponseDto<OnlineResyncStateResponse>;
const recovered = applyOnlineStateDiffResponse(awaitingResync, resync);
assert.equal(recovered.pendingPredictions.length, 0);
assert.deepEqual(recovered.state.tanks[0]?.position, { x: 23, y: 50 });
assert.equal(recovered.state.terrain.surface[23], 50);
assert.equal(recovered.state.gameContentVersion, "game-content.v1");
