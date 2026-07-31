import { onlineGameContentResponseFixture } from "../../support/onlineGameContentResponseFixture";
import assert from "node:assert/strict";

import type {
  OnlineDiffResponseDto,
  OnlineGameStateSnapshotResponse,
  OnlineInitialStateResponse,
  OnlineCrateSpawnedResponse,
  OnlineTurnStartedResponse,
  OnlineProjectileResolvedResponse,
  OnlineTurnTransitionResponse,
} from "../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  applyOnlineStateDiffResponse,
  initializeOnlineConfirmedState,
} from "../../../src/game/online/onlineConfirmedState";
import {
  createOnlineGameManager,
} from "../../../src/game/authority/OnlineGameManager";
import type { GameManager } from "../../../src/game";
import type {
  OnlineGameplayTransport,
} from "../../../src/game/online/OnlineGameplayTransport";
import type {
  OnlinePlayerIntentRequestDto,
} from "../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";

// === Fixtures ===

function onlineState(): OnlineGameStateSnapshotResponse {
  return {
    gameContentVersion: "game-content.v1",
    gameContent: onlineGameContentResponseFixture,
    match: {
      phase: "AIMING",
      activePlayerId: 1,
      playerCount: 2,
      turnNumber: 1,
      turnTimeRemainingTicks: 900,
      winnerPlayerId: null,
      wind: 0,
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

function initialDiff(): OnlineDiffResponseDto<OnlineInitialStateResponse> {
  return {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 1,
    serverTick: 0,
    type: "INITIAL_STATE",
    intentId: null,
    payload: {
      expectedNextDiffSequence: 2,
      localPlayerId: 1,
      state: onlineState(),
    },
  };
}

function createTransport(): {
  emit(diff: OnlineDiffResponseDto): void;
  resyncRequests: number;
  sentIntents: OnlinePlayerIntentRequestDto[];
  transport: OnlineGameplayTransport;
} {
  let listener: ((diff: OnlineDiffResponseDto) => void) | null = null;
  let resyncRequests = 0;
  const sentIntents: OnlinePlayerIntentRequestDto[] = [];

  return {
    emit(diff: OnlineDiffResponseDto): void {
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

// =======================================================================
// AC 1: CRATE_SPAWNED — Server-authoritative crate spawn broadcast
// =======================================================================

// 1a. CRATE_SPAWNED diff adds a crate to confirmed state lootCrates
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const crateSpawned = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 1800,
    type: "CRATE_SPAWNED",
    intentId: null,
    payload: {
      crateId: "crate-1",
      crateType: "hp",
      dropX: 400,
      targetY: 250,
    },
  } satisfies OnlineDiffResponseDto<OnlineCrateSpawnedResponse>;

  const afterCrate = applyOnlineStateDiffResponse(confirmed, crateSpawned);
  assert.equal(afterCrate.state.lootCrates?.length, 1);
  assert.equal(afterCrate.state.lootCrates![0]!.crateId, "crate-1");
  assert.equal(afterCrate.state.lootCrates![0]!.crateType, "hp");
  assert.equal(afterCrate.state.lootCrates![0]!.x, 400);
  assert.equal(afterCrate.state.lootCrates![0]!.targetY, 250);
  assert.equal(afterCrate.state.lootCrates![0]!.isLanding, true);
  assert.equal(afterCrate.state.lootCrates![0]!.collected, false);
}

// 1b. Multiple CRATE_SPAWNED diffs accumulate at minute marks 1, 2, 3
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const crate1 = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 1800,
    type: "CRATE_SPAWNED",
    intentId: null,
    payload: { crateId: "crate-1", crateType: "hp", dropX: 200, targetY: 250 },
  } satisfies OnlineDiffResponseDto<OnlineCrateSpawnedResponse>;

  const crate2 = {
    ...crate1,
    sequence: 3,
    serverTick: 3600,
    payload: { crateId: "crate-2", crateType: "fuel", dropX: 500, targetY: 260 },
  } satisfies OnlineDiffResponseDto<OnlineCrateSpawnedResponse>;

  const crate3 = {
    ...crate1,
    sequence: 4,
    serverTick: 5400,
    payload: { crateId: "crate-3", crateType: "ammo", dropX: 700, targetY: 270 },
  } satisfies OnlineDiffResponseDto<OnlineCrateSpawnedResponse>;

  let state = applyOnlineStateDiffResponse(confirmed, crate1);
  state = applyOnlineStateDiffResponse(state, crate2);
  state = applyOnlineStateDiffResponse(state, crate3);

  assert.equal(state.state.lootCrates?.length, 3);
  assert.equal(state.state.lootCrates![0]!.crateType, "hp");
  assert.equal(state.state.lootCrates![1]!.crateType, "fuel");
  assert.equal(state.state.lootCrates![2]!.crateType, "ammo");
}

// 1c. CRATE_SPAWNED through OnlineGameManager propagates to GameState
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
    serverTick: 1800,
    type: "CRATE_SPAWNED",
    intentId: null,
    payload: {
      crateId: "crate-1",
      crateType: "fuel",
      dropX: 300,
      targetY: 200,
    },
  });

  const state = gameManager.getState();
  assert.equal(state.lootCrates?.length, 1);
  assert.equal(state.lootCrates![0]!.type, "fuel");
  assert.equal(state.lootCrates![0]!.x, 300);
  gameManager.destroy();
}

// =======================================================================
// AC 2: TURN_STARTED — Server-authoritative wind vector in turn start
// =======================================================================

// 2a. TURN_STARTED diff updates match state with wind
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const turnStarted = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 150,
    type: "TURN_STARTED",
    intentId: null,
    payload: {
      previousPlayerId: 1,
      activePlayerId: 2,
      turnNumber: 2,
      phase: "AIMING",
      turnEndsAtServerTick: 1050,
      wind: 3.5,
    },
  } satisfies OnlineDiffResponseDto<OnlineTurnStartedResponse>;

  const afterTurn = applyOnlineStateDiffResponse(confirmed, turnStarted);
  assert.equal(afterTurn.state.match.activePlayerId, 2);
  assert.equal(afterTurn.state.match.turnNumber, 2);
  assert.equal(afterTurn.state.match.phase, "AIMING");
  assert.equal(afterTurn.state.match.wind, 3.5);
}

// 2b. Negative wind values are preserved
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const turnStarted = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 150,
    type: "TURN_STARTED",
    intentId: null,
    payload: {
      previousPlayerId: 1,
      activePlayerId: 2,
      turnNumber: 2,
      phase: "AIMING",
      turnEndsAtServerTick: 1050,
      wind: -6.8,
    },
  } satisfies OnlineDiffResponseDto<OnlineTurnStartedResponse>;

  const afterTurn = applyOnlineStateDiffResponse(confirmed, turnStarted);
  assert.equal(afterTurn.state.match.wind, -6.8);
}

// 2c. TURN_STARTED wind propagates through OnlineGameManager to GameState
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
    serverTick: 150,
    type: "TURN_STARTED",
    intentId: null,
    payload: {
      previousPlayerId: 1,
      activePlayerId: 2,
      turnNumber: 2,
      phase: "AIMING",
      turnEndsAtServerTick: 1050,
      wind: 5.2,
    },
  });

  const state = gameManager.getState();
  assert.equal(state.match.wind, 5.2);
  assert.equal(state.match.activePlayerId, 2);
  assert.equal(state.match.turnNumber, 2);
  gameManager.destroy();
}

// 2d. TURN_STARTED computes remaining ticks from server tick delta
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const turnStarted = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 150,
    type: "TURN_STARTED",
    intentId: null,
    payload: {
      previousPlayerId: 1,
      activePlayerId: 2,
      turnNumber: 2,
      phase: "AIMING",
      turnEndsAtServerTick: 1050,
      wind: 0,
    },
  } satisfies OnlineDiffResponseDto<OnlineTurnStartedResponse>;

  const afterTurn = applyOnlineStateDiffResponse(confirmed, turnStarted);
  // 1050 - 150 (lastConfirmedDiffServerTick from turnStarted diff) = 900
  assert.equal(afterTurn.state.match.turnTimeRemainingTicks, 900);
}

// =======================================================================
// AC 3: PROJECTILE_RESOLVED — Multi-projectile resolution with sub-munitions
// =======================================================================

// 3a. PROJECTILE_RESOLVED applies primary damage and removes projectile
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const resolved = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 90,
    type: "PROJECTILE_RESOLVED",
    intentId: "intent-fire",
    payload: {
      intentId: "intent-fire",
      projectileEntityId: 99,
      ownerPlayerId: 1,
      projectileDefinitionId: "basicShell",
      projectileRenderAssetId: "projectile.basic-shell",
      impactRenderAssetId: "impact.orange-pop",
      launch: { x: 50, y: 120 },
      trajectory: [{ x: 50, y: 120 }, { x: 150, y: 120 }],
      impact: { x: 150, y: 120 },
      damagedTanks: [
        { tankEntityId: 20, playerId: 2, damage: 30, remainingHealth: 64 },
      ],
      subMunitions: [],
      craterEvents: [{ position: { x: 150, y: 120 }, radius: 24 }],
      damageTrailEvents: [],
    },
  } satisfies OnlineDiffResponseDto<OnlineProjectileResolvedResponse>;

  const afterResolved = applyOnlineStateDiffResponse(
    confirmed,
    resolved,
    () => 2000,
  );
  assert.equal(afterResolved.state.tanks[1]?.health, 64);
  assert.equal(afterResolved.state.tanks[1]?.alive, true);
  assert.equal(afterResolved.state.projectiles.length, 0);
  assert.equal(afterResolved.impactEvents.length, 1);
  assert.equal(afterResolved.impactEvents[0]?.position.x, 150);
}

// 3b. PROJECTILE_RESOLVED with sub-munitions applies all damage
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const resolved = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 90,
    type: "PROJECTILE_RESOLVED",
    intentId: "intent-cluster",
    payload: {
      intentId: "intent-cluster",
      projectileEntityId: 99,
      ownerPlayerId: 1,
      projectileDefinitionId: "cluster",
      projectileRenderAssetId: "projectile.cluster",
      impactRenderAssetId: "impact.cluster",
      launch: { x: 50, y: 120 },
      trajectory: [{ x: 50, y: 120 }, { x: 140, y: 80 }],
      impact: { x: 140, y: 80 },
      damagedTanks: [],
      subMunitions: [
        {
          projectileDefinitionId: "cluster-sub",
          projectileRenderAssetId: "projectile.cluster-sub",
          impactRenderAssetId: "impact.cluster-sub",
          launch: { x: 140, y: 80 },
          trajectory: [{ x: 140, y: 80 }, { x: 130, y: 120 }],
          impact: { x: 130, y: 120 },
          damagedTanks: [
            { tankEntityId: 20, playerId: 2, damage: 15, remainingHealth: 79 },
          ],
        },
        {
          projectileDefinitionId: "cluster-sub",
          projectileRenderAssetId: "projectile.cluster-sub",
          impactRenderAssetId: "impact.cluster-sub",
          launch: { x: 140, y: 80 },
          trajectory: [{ x: 140, y: 80 }, { x: 150, y: 120 }],
          impact: { x: 150, y: 120 },
          damagedTanks: [
            { tankEntityId: 20, playerId: 2, damage: 20, remainingHealth: 59 },
          ],
        },
        {
          projectileDefinitionId: "cluster-sub",
          projectileRenderAssetId: "projectile.cluster-sub",
          impactRenderAssetId: "impact.cluster-sub",
          launch: { x: 140, y: 80 },
          trajectory: [{ x: 140, y: 80 }, { x: 160, y: 120 }],
          impact: { x: 160, y: 120 },
          damagedTanks: [],
        },
      ],
      craterEvents: [
        { position: { x: 130, y: 120 }, radius: 12 },
        { position: { x: 150, y: 120 }, radius: 12 },
        { position: { x: 160, y: 120 }, radius: 12 },
      ],
      damageTrailEvents: [],
    },
  } satisfies OnlineDiffResponseDto<OnlineProjectileResolvedResponse>;

  const afterResolved = applyOnlineStateDiffResponse(
    confirmed,
    resolved,
    () => 3000,
  );

  // Tank 20 final health: last sub-munition to damage it reports 59
  assert.equal(afterResolved.state.tanks[1]?.health, 59);
  assert.equal(afterResolved.state.tanks[1]?.alive, true);
  assert.equal(afterResolved.state.projectiles.length, 0);

  // Impact events: 1 primary + 3 sub-munitions = 4
  assert.equal(afterResolved.impactEvents.length, 4);
  assert.equal(afterResolved.impactEvents[0]?.position.x, 140);
  assert.equal(afterResolved.impactEvents[0]?.position.y, 80);
  assert.equal(afterResolved.impactEvents[1]?.position.x, 130);
  assert.equal(afterResolved.impactEvents[2]?.position.x, 150);
  assert.equal(afterResolved.impactEvents[3]?.position.x, 160);
}

// 3c. PROJECTILE_RESOLVED kills tank when health reaches 0
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const resolved = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 90,
    type: "PROJECTILE_RESOLVED",
    intentId: "intent-nuke",
    payload: {
      intentId: "intent-nuke",
      projectileEntityId: 99,
      ownerPlayerId: 1,
      projectileDefinitionId: "phantomNuke",
      projectileRenderAssetId: "projectile.nuke",
      impactRenderAssetId: "impact.nuke",
      launch: { x: 50, y: 120 },
      trajectory: [{ x: 50, y: 120 }, { x: 150, y: 120 }],
      impact: { x: 150, y: 120 },
      damagedTanks: [
        { tankEntityId: 20, playerId: 2, damage: 94, remainingHealth: 0 },
      ],
      subMunitions: [],
      craterEvents: [{ position: { x: 150, y: 120 }, radius: 60 }],
      damageTrailEvents: [],
    },
  } satisfies OnlineDiffResponseDto<OnlineProjectileResolvedResponse>;

  const afterResolved = applyOnlineStateDiffResponse(
    confirmed,
    resolved,
    () => 4000,
  );
  assert.equal(afterResolved.state.tanks[1]?.health, 0);
  assert.equal(afterResolved.state.tanks[1]?.alive, false);
}

// 3d. PROJECTILE_RESOLVED with autocannon sub-munitions (sequential damage)
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const resolved = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 90,
    type: "PROJECTILE_RESOLVED",
    intentId: "intent-autocannon",
    payload: {
      intentId: "intent-autocannon",
      projectileEntityId: 99,
      ownerPlayerId: 1,
      projectileDefinitionId: "autocannonStream",
      projectileRenderAssetId: "projectile.autocannon",
      impactRenderAssetId: "impact.autocannon",
      launch: { x: 50, y: 120 },
      trajectory: [{ x: 50, y: 120 }, { x: 148, y: 120 }],
      impact: { x: 148, y: 120 },
      damagedTanks: [
        { tankEntityId: 20, playerId: 2, damage: 12, remainingHealth: 82 },
      ],
      subMunitions: [
        {
          projectileDefinitionId: "autocannonStream",
          projectileRenderAssetId: "projectile.autocannon",
          impactRenderAssetId: "impact.autocannon",
          launch: { x: 50, y: 120 },
          trajectory: [{ x: 50, y: 120 }, { x: 149, y: 120 }],
          impact: { x: 149, y: 120 },
          damagedTanks: [
            { tankEntityId: 20, playerId: 2, damage: 12, remainingHealth: 70 },
          ],
        },
        {
          projectileDefinitionId: "autocannonStream",
          projectileRenderAssetId: "projectile.autocannon",
          impactRenderAssetId: "impact.autocannon",
          launch: { x: 50, y: 120 },
          trajectory: [{ x: 50, y: 120 }, { x: 150, y: 120 }],
          impact: { x: 150, y: 120 },
          damagedTanks: [
            { tankEntityId: 20, playerId: 2, damage: 12, remainingHealth: 58 },
          ],
        },
        {
          projectileDefinitionId: "autocannonStream",
          projectileRenderAssetId: "projectile.autocannon",
          impactRenderAssetId: "impact.autocannon",
          launch: { x: 50, y: 120 },
          trajectory: [{ x: 50, y: 120 }, { x: 151, y: 120 }],
          impact: { x: 151, y: 120 },
          damagedTanks: [
            { tankEntityId: 20, playerId: 2, damage: 12, remainingHealth: 46 },
          ],
        },
      ],
      craterEvents: [
        { position: { x: 148, y: 120 }, radius: 8 },
        { position: { x: 149, y: 120 }, radius: 8 },
        { position: { x: 150, y: 120 }, radius: 8 },
        { position: { x: 151, y: 120 }, radius: 8 },
      ],
      damageTrailEvents: [],
    },
  } satisfies OnlineDiffResponseDto<OnlineProjectileResolvedResponse>;

  const afterResolved = applyOnlineStateDiffResponse(
    confirmed,
    resolved,
    () => 5000,
  );

  // Final health after 4 autocannon rounds: 46
  assert.equal(afterResolved.state.tanks[1]?.health, 46);
  // 1 primary + 3 sub = 4 impacts
  assert.equal(afterResolved.impactEvents.length, 4);
}

// 3e. PROJECTILE_RESOLVED through OnlineGameManager propagates to GameState
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
    serverTick: 90,
    type: "PROJECTILE_RESOLVED",
    intentId: "intent-fire",
    payload: {
      intentId: "intent-fire",
      projectileEntityId: 99,
      ownerPlayerId: 1,
      projectileDefinitionId: "basicShell",
      projectileRenderAssetId: "projectile.basic-shell",
      impactRenderAssetId: "impact.orange-pop",
      launch: { x: 50, y: 120 },
      trajectory: [{ x: 50, y: 120 }, { x: 150, y: 120 }],
      impact: { x: 150, y: 120 },
      damagedTanks: [
        { tankEntityId: 20, playerId: 2, damage: 44, remainingHealth: 50 },
      ],
      subMunitions: [],
      craterEvents: [{ position: { x: 150, y: 120 }, radius: 24 }],
      damageTrailEvents: [],
    },
  });

  assert.equal(gameManager.getState().projectiles.length, 0);
  assert.equal(gameManager.getState().impactEvents.length, 1);
  assert.equal(gameManager.getState().impactEvents[0]?.position.x, 150);
  assert.equal(gameManager.getState().tanks[1]?.health, 50);
  gameManager.destroy();
}

// 3f. PROJECTILE_RESOLVED reconciles pending fire prediction
{
  const test = createTransport();
  const gameManager: GameManager = createOnlineGameManager({
    transport: test.transport,
    intentIdFactory: () => "intent-fire",
    monotonicNowMs: () => 1000,
  });

  test.emit(initialDiff());
  gameManager.submitAction({
    type: "fire",
    angle: 42,
    power: 0.75,
    projectileSlotId: "standard",
  });

  test.emit({
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 90,
    type: "PROJECTILE_RESOLVED",
    intentId: "intent-fire",
    payload: {
      intentId: "intent-fire",
      projectileEntityId: 99,
      ownerPlayerId: 1,
      projectileDefinitionId: "basicShell",
      projectileRenderAssetId: "projectile.basic-shell",
      impactRenderAssetId: "impact.orange-pop",
      launch: { x: 50, y: 120 },
      trajectory: [{ x: 50, y: 120 }, { x: 150, y: 120 }],
      impact: { x: 150, y: 120 },
      damagedTanks: [],
      subMunitions: [],
      craterEvents: [],
      damageTrailEvents: [],
    },
  });

  // Should not throw and state should be consistent
  assert.equal(gameManager.getState().projectiles.length, 0);
  assert.equal(gameManager.getState().impactEvents.length, 1);
  gameManager.destroy();
}

// 3g. PROJECTILE_RESOLVED with damage trail events
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const resolved = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 90,
    type: "PROJECTILE_RESOLVED",
    intentId: "intent-trail",
    payload: {
      intentId: "intent-trail",
      projectileEntityId: 99,
      ownerPlayerId: 1,
      projectileDefinitionId: "thermalHazard",
      projectileRenderAssetId: "projectile.thermal",
      impactRenderAssetId: "impact.thermal",
      launch: { x: 50, y: 120 },
      trajectory: [{ x: 50, y: 120 }, { x: 150, y: 120 }],
      impact: { x: 150, y: 120 },
      damagedTanks: [
        { tankEntityId: 20, playerId: 2, damage: 15, remainingHealth: 79 },
      ],
      subMunitions: [],
      craterEvents: [{ position: { x: 150, y: 120 }, radius: 16 }],
      damageTrailEvents: [
        {
          id: "trail-1",
          position: { x: 150, y: 120 },
          radius: 30,
          durationSeconds: 5,
          damagePerSecond: 8,
          ownerPlayerId: 1,
        },
      ],
    },
  } satisfies OnlineDiffResponseDto<OnlineProjectileResolvedResponse>;

  const afterResolved = applyOnlineStateDiffResponse(
    confirmed,
    resolved,
    () => 6000,
  );
  assert.equal(afterResolved.state.tanks[1]?.health, 79);
  assert.equal(afterResolved.impactEvents.length, 1);
}

// =======================================================================
// Combined: TURN_STARTED with wind followed by CRATE_SPAWNED
// =======================================================================
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());

  // Turn started with wind
  let state = applyOnlineStateDiffResponse(confirmed, {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 150,
    type: "TURN_STARTED",
    intentId: null,
    payload: {
      previousPlayerId: 1,
      activePlayerId: 2,
      turnNumber: 2,
      phase: "AIMING",
      turnEndsAtServerTick: 1050,
      wind: -4.3,
    },
  } satisfies OnlineDiffResponseDto<OnlineTurnStartedResponse>);

  // Crate spawned during same turn
  state = applyOnlineStateDiffResponse(state, {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 3,
    serverTick: 1800,
    type: "CRATE_SPAWNED",
    intentId: null,
    payload: {
      crateId: "crate-combo",
      crateType: "ammo",
      dropX: 450,
      targetY: 240,
    },
  } satisfies OnlineDiffResponseDto<OnlineCrateSpawnedResponse>);

  assert.equal(state.state.match.wind, -4.3);
  assert.equal(state.state.match.activePlayerId, 2);
  assert.equal(state.state.lootCrates?.length, 1);
  assert.equal(state.state.lootCrates![0]!.crateType, "ammo");
}

// =======================================================================
// Existing TURN_TRANSITION still works (backward compatibility)
// =======================================================================
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  const turnTransition = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 150,
    type: "TURN_TRANSITION",
    intentId: null,
    payload: {
      previousPlayerId: 1,
      activePlayerId: 2,
      turnNumber: 2,
      phase: "AIMING",
      turnEndsAtServerTick: 1050,
    },
  } satisfies OnlineDiffResponseDto<OnlineTurnTransitionResponse>;

  const afterTurn = applyOnlineStateDiffResponse(confirmed, turnTransition);
  assert.equal(afterTurn.state.match.activePlayerId, 2);
  assert.equal(afterTurn.state.match.turnNumber, 2);
}

// =======================================================================
// Sequence validation applies to new diff types
// =======================================================================
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());

  // CRATE_SPAWNED with wrong sequence should throw
  assert.throws(
    () =>
      applyOnlineStateDiffResponse(confirmed, {
        protocolVersion: "online-gameplay.v1",
        gameSessionId: "game-123",
        sequence: 5,
        serverTick: 1800,
        type: "CRATE_SPAWNED",
        intentId: null,
        payload: {
          crateId: "crate-bad",
          crateType: "hp",
          dropX: 300,
          targetY: 200,
        },
      }),
  );
}

// =======================================================================
// Crater terrain deformation in PROJECTILE_RESOLVED
// =======================================================================
{
  const confirmed = initializeOnlineConfirmedState(initialDiff());
  assert.equal(confirmed.state.terrain.surface[2], 1);

  const resolvedWithCrater = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 2,
    serverTick: 90,
    type: "PROJECTILE_RESOLVED",
    intentId: "intent-crater",
    payload: {
      intentId: "intent-crater",
      projectileEntityId: 99,
      ownerPlayerId: 1,
      projectileDefinitionId: "basicShell",
      projectileRenderAssetId: "projectile.basic-shell",
      impactRenderAssetId: "impact.orange-pop",
      launch: { x: 2, y: 1 },
      trajectory: [{ x: 2, y: 1 }],
      impact: { x: 2, y: 1 },
      damagedTanks: [],
      subMunitions: [],
      craterEvents: [{ position: { x: 2, y: 1 }, radius: 2 }],
      damageTrailEvents: [],
    },
  } satisfies OnlineDiffResponseDto<OnlineProjectileResolvedResponse>;

  const afterCrater = applyOnlineStateDiffResponse(
    confirmed,
    resolvedWithCrater,
    () => 2000,
  );
  // Terrain surface at x=2 should be deformed downward by crater radius
  assert.ok(afterCrater.state.terrain.surface[2]! >= 2);
}

