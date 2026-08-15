import { describe, it, expect } from "vitest";
import {
  initializeOnlineConfirmedState,
  applyOnlineStateDiffResponse,
  predictOnlineMovement,
  OnlineDiffSequenceError,
} from "../../../../src/game/online/onlineConfirmedState";
import { toGameState } from "../../../../src/game/online/onlineGameState";
import type { OnlineDiffResponseDto } from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import { localGameContent } from "../../../../src/game/content/localGameContent";
import { createInitialDiff, createTestSnapshot } from "./mockOnlineTestState";

describe("onlineConfirmedState & onlineGameState", () => {
  const ctx = {
    clock: () => 1000,
    generateIntentId: () => "intent-1",
    gameContent: localGameContent,
  };

  it("initializes state correctly from INITIAL_STATE diff", () => {
    const diff = createInitialDiff(1);
    const confirmed = initializeOnlineConfirmedState(diff);
    expect(confirmed.gameSessionId).toBe("test-session-123");
    expect(confirmed.lastConfirmedDiffSequence).toBe(1);
    expect(confirmed.expectedNextDiffSequence).toBe(2);
  });

  it("applies AIM_UPDATE diff and updates aiming parameters", () => {
    let state = initializeOnlineConfirmedState(createInitialDiff(1));

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
    const state = initializeOnlineConfirmedState(createInitialDiff(1));

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
    const confirmed = initializeOnlineConfirmedState(createInitialDiff(1));

    const predicted = predictOnlineMovement(confirmed, "move-intent-1", 1, { direction: 1 });
    expect(predicted.pendingPredictions.length).toBe(1);
    expect(predicted.pendingPredictions[0]!.predictedMovement?.to.x).toBeGreaterThan(200);
  });

  it("prevents movement prediction when tank has 0 fuel remaining", () => {
    const snapshot = createTestSnapshot();
    snapshot.tanks[0]!.fuel = 0; // 0 fuel edge case

    const initDiff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 1,
      serverTick: 0,
      type: "INITIAL_STATE",
      intentId: null,
      payload: { expectedNextDiffSequence: 2, localPlayerId: 1, state: snapshot },
    };
    const confirmed = initializeOnlineConfirmedState(initDiff);

    const predicted = predictOnlineMovement(confirmed, "move-intent-no-fuel", 1, { direction: 1 });
    // Tank cannot move without fuel, so no pending prediction added
    expect(predicted.pendingPredictions.length).toBe(0);
  });

  it("converts OnlineConfirmedState into GameState with computed slope bodyAngle", () => {
    const snapshot = createTestSnapshot();
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
