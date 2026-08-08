import { describe, it, expect } from "vitest";
import { onlineSnapshotToGameState } from "../../../src/game/online/onlineGameState";
import { initializeOnlineConfirmedState, applyOnlineStateDiffResponse, projectOnlineRenderState } from "../../../src/game/online/onlineConfirmedState";
import { localGameContent } from "../../../src/game/content/localGameContent";
import { defaultWorldCoordinateMapper } from "../../../src/game/online/onlineWorldMapper";
import type { OnlineDiffResponseDto, OnlineGameStateSnapshotResponse } from "../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";

function createMockInitialStateDiff(): OnlineDiffResponseDto {
  const mockSnapshot: OnlineGameStateSnapshotResponse = {
    gameContentVersion: "v1.0",
    gameContent: localGameContent as any,
    match: {
      phase: "AIMING",
      activePlayerId: 1,
      playerCount: 2,
      turnNumber: 1,
      turnTimeRemainingTicks: 900,
      winnerPlayerId: null,
      matchTimeRemainingTicks: 5400,
      wind: 0,
      biome: "forest",
    },
    terrain: {
      kind: "HEIGHTMAP",
      width: 1024,
      height: 768,
      surface: new Array(1024).fill(400),
    },
    tanks: [
      {
        entityId: 10,
        playerId: 1,
        displayName: "Player 1",
        tankDefinitionId: "vanguard-cyber",
        width: 32,
        height: 16,
        visual: { fillStyle: "#3b82f6", strokeStyle: "#1d4ed8", accentColor: "#60a5fa", label: "VC" },
        position: { x: 200, y: 400 },
        facing: 1,
        aimAngle: 45,
        power: 300,
        selectedProjectileSlotId: "basicShell",
        loadout: ["basicShell"],
        health: 100,
        maxHealth: 100,
        fuel: 240,
        alive: true,
      },
      {
        entityId: 11,
        playerId: 2,
        displayName: "Player 2",
        tankDefinitionId: "specter",
        width: 32,
        height: 16,
        visual: { fillStyle: "#8b5cf6", strokeStyle: "#6d28d9", accentColor: "#a78bfa", label: "S" },
        position: { x: 800, y: 400 },
        facing: -1,
        aimAngle: 45,
        power: 300,
        selectedProjectileSlotId: "basicShell",
        loadout: ["basicShell"],
        health: 100,
        maxHealth: 100,
        fuel: 240,
        alive: true,
      },
    ],
    projectiles: [],
    lootCrates: [],
    damageTrails: [],
  };

  return {
    gameSessionId: "test-session-123",
    sequence: 1,
    serverTick: 0,
    type: "INITIAL_STATE",
    intentId: null,
    payload: {
      localPlayerId: 1,
      expectedNextDiffSequence: 2,
      state: mockSnapshot,
    },
  };
}

describe("Online World Scaling, Slope Angles & Movement Consistency", () => {
  it("computes tank bodyAngle from terrain slope instead of hardcoding 0", () => {
    const diff = createMockInitialStateDiff();
    const surface = new Array(1024).fill(400);
    // Create a 45 degree slope at tank position x=200
    for (let x = 0; x < 1024; x++) {
      surface[x] = 400 + (x - 200);
    }
    (diff.payload as any).state.terrain.surface = surface;

    const ctx = {
      clock: () => 1000,
      generateIntentId: () => "test-intent",
      gameContent: localGameContent,
    };

    const confirmed = initializeOnlineConfirmedState(diff);
    const gameState = onlineSnapshotToGameState(confirmed.state, 1, [], ctx);

    const tank1 = gameState.tanks.find((t) => t.playerId === 1);
    expect(tank1).toBeDefined();
    // Tank bodyAngle should reflect the slope, not be 0
    expect(tank1?.bodyAngle).not.toBe(0);
  });

  it("scales server world dimensions (1024) to client world width (3072) by factor of 3", () => {
    const diff = createMockInitialStateDiff();
    const ctx = {
      clock: () => 1000,
      generateIntentId: () => "test-intent",
      gameContent: localGameContent,
    };

    const confirmed = initializeOnlineConfirmedState(diff);
    const gameState = onlineSnapshotToGameState(confirmed.state, 1, [], ctx);

    expect(gameState.terrain.width).toBe(3072);
    // Server position 200 should scale to 600
    const tank1 = gameState.tanks.find((t) => t.playerId === 1);
    expect(tank1?.position.x).toBe(600);
  });

  it("smoothly interpolates opponent movement segments along mapped coordinates", () => {
    const diff = createMockInitialStateDiff();
    let clockMs = 1000;
    const ctx = {
      clock: () => clockMs,
      generateIntentId: () => "test-intent",
      gameContent: localGameContent,
    };

    let confirmed = initializeOnlineConfirmedState(diff);

    // Opponent (Player 2, entityId 11) moves from 800 to 750 (server coords)
    const moveSegmentDiff: OnlineDiffResponseDto = {
      gameSessionId: "test-session-123",
      sequence: 2,
      serverTick: 10,
      type: "MOVEMENT_SEGMENT",
      intentId: "move-1",
      payload: {
        playerId: 2,
        tankEntityId: 11,
        from: { x: 800, y: 400 },
        to: { x: 750, y: 400 },
        movementPath: [
          { x: 800, y: 400 },
          { x: 775, y: 400 },
          { x: 750, y: 400 },
        ],
        fuelBefore: 240,
        fuelAfter: 200,
        fuelSpent: 40,
        partial: false,
        startedServerTick: 0,
        endedServerTick: 15,
        durationTicks: 15,
      },
    };

    confirmed = applyOnlineStateDiffResponse(confirmed, moveSegmentDiff, ctx);

    // Midway through interpolation (250ms into 500ms duration)
    clockMs = 1250;
    const renderSnapshot = projectOnlineRenderState(confirmed, ctx);
    const midState = onlineSnapshotToGameState(renderSnapshot, 1, [], ctx);
    const p2Tank = midState.tanks.find((t) => t.playerId === 2);
    
    // Position should be smoothly interpolated in client coordinates (server 800->2400, 750->2250, mid ~2325)
    expect(p2Tank?.position.x).toBeLessThan(2400);
    expect(p2Tank?.position.x).toBeGreaterThan(2250);
  });
});
