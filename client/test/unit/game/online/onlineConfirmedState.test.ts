import { describe, it, expect } from "vitest";
import {
  initializeOnlineConfirmedState,
  applyOnlineStateDiffResponse,
  predictOnlineMovement,
  OnlineDiffSequenceError,
  type OnlineConfirmedState,
} from "../../../../src/game/online/onlineConfirmedState";
import { toGameState } from "../../../../src/game/online/onlineGameState";
import type {
  OnlineDiffResponseDto,
  OnlineGameStateSnapshotResponse,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import { localGameContent } from "../../../../src/game/content/localGameContent";

function createMockSnapshot(): OnlineGameStateSnapshotResponse {
  return {
    gameContentVersion: "v1.0",
    gameContent: {
      ...localGameContent,
      world: { ...localGameContent.world, width: 2400 },
    } as any,
    match: {
      phase: "AIMING",
      activePlayerId: 1,
      playerCount: 2,
      turnNumber: 1,
      turnTimeRemainingTicks: 900,
      winnerPlayerId: null,
      matchTimeRemainingTicks: 5400,
      wind: 5,
      biome: "forest",
    },
    terrain: {
      kind: "HEIGHTMAP",
      width: 2400,
      height: 768,
      surface: new Array(2400).fill(400),
    },
    tanks: [
      {
        entityId: 10,
        playerId: 1,
        displayName: "Player 1",
        tankDefinitionId: "vanguard-cyber",
        width: 32,
        height: 16,
        visual: { fillStyle: "#3b82f6", strokeStyle: "#1d4ed8", accentColor: "#60a5fa", label: "P1" },
        position: { x: 200, y: 392 },
        facing: 1,
        aimAngle: -Math.PI / 4,
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
}

describe("onlineConfirmedState & onlineGameState", () => {
  const ctx = {
    clock: () => 1000,
    generateIntentId: () => "intent-1",
    gameContent: localGameContent,
  };

  it("initializes state correctly from INITIAL_STATE diff", () => {
    const diff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 1,
      serverTick: 0,
      type: "INITIAL_STATE",
      intentId: null,
      payload: {
        expectedNextDiffSequence: 2,
        localPlayerId: 1,
        state: createMockSnapshot(),
      },
    };

    const confirmed = initializeOnlineConfirmedState(diff);
    expect(confirmed.gameSessionId).toBe("session-123");
    expect(confirmed.lastConfirmedDiffSequence).toBe(1);
    expect(confirmed.expectedNextDiffSequence).toBe(2);
  });

  it("applies AIM_UPDATE diff and updates aiming parameters", () => {
    const initDiff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 1,
      serverTick: 0,
      type: "INITIAL_STATE",
      intentId: null,
      payload: { expectedNextDiffSequence: 2, localPlayerId: 1, state: createMockSnapshot() },
    };
    let state = initializeOnlineConfirmedState(initDiff);

    const aimDiff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 2,
      serverTick: 10,
      type: "AIM_UPDATE",
      intentId: "aim-1",
      payload: { playerId: 1, angle: -Math.PI / 3, power: 500 },
    };

    state = applyOnlineStateDiffResponse(state, aimDiff, ctx);
    expect(state.state.tanks[0]!.aimAngle).toBeCloseTo(-Math.PI / 3);
    expect(state.state.tanks[0]!.power).toBe(500);
  });

  it("throws OnlineDiffSequenceError when receiving out-of-order diff sequence", () => {
    const initDiff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 1,
      serverTick: 0,
      type: "INITIAL_STATE",
      intentId: null,
      payload: { expectedNextDiffSequence: 2, localPlayerId: 1, state: createMockSnapshot() },
    };
    const state = initializeOnlineConfirmedState(initDiff);

    const outOfOrderDiff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 5, // Expected sequence is 2
      serverTick: 50,
      type: "AIM_UPDATE",
      intentId: "aim-5",
      payload: { playerId: 1, angle: -Math.PI / 3, power: 500 },
    };

    expect(() => applyOnlineStateDiffResponse(state, outOfOrderDiff, ctx)).toThrow(
      OnlineDiffSequenceError,
    );
  });

  it("predicts client-side tank movement along terrain surface", () => {
    const initDiff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 1,
      serverTick: 0,
      type: "INITIAL_STATE",
      intentId: null,
      payload: { expectedNextDiffSequence: 2, localPlayerId: 1, state: createMockSnapshot() },
    };
    const confirmed = initializeOnlineConfirmedState(initDiff);

    const predicted = predictOnlineMovement(confirmed, "move-intent-1", 1, { direction: 1 });
    expect(predicted.pendingPredictions.length).toBe(1);
    expect(predicted.pendingPredictions[0]!.predictedMovement?.to.x).toBeGreaterThan(200);
  });

  it("converts OnlineConfirmedState into GameState with computed slope bodyAngle", () => {
    const snapshot = createMockSnapshot();
    // Simulate terrain slope under tank at x=200
    snapshot.terrain.surface[184] = 380;
    snapshot.terrain.surface[216] = 420;

    const initDiff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 1,
      serverTick: 0,
      type: "INITIAL_STATE",
      intentId: null,
      payload: { expectedNextDiffSequence: 2, localPlayerId: 1, state: snapshot },
    };
    const confirmed = initializeOnlineConfirmedState(initDiff);

    const gameState = toGameState(confirmed, snapshot, ctx);
    expect(gameState.tanks[0]!.bodyAngle).not.toBe(0);
    expect(gameState.match.cameraX).toBe(0);
    expect(gameState.terrain.width).toBe(2400);
  });
});
