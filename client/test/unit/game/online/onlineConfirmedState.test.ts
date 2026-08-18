import { describe, it, expect } from "vitest";
import {
  initializeOnlineConfirmedState,
  applyOnlineStateDiffResponse,
  predictOnlineMovement,
  projectOnlineRenderState,
  OnlineDiffSequenceError,
} from "../../../../src/game/online/onlineConfirmedState";
import { toGameState } from "../../../../src/game/online/onlineGameState";
import type { OnlineDiffResponseDto } from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import { createInitialDiff, createTestSnapshot, testGameContent } from "./mockOnlineTestState";

describe("onlineConfirmedState & onlineGameState", () => {
  const ctx = {
    clock: () => 1000,
    generateIntentId: () => "intent-1",
    gameContent: testGameContent,
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
    for (let x = 180; x <= 220; x++) {
      snapshot.terrain.surface[x] = 400 + (x - 200);
    }

    const initDiff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 1,
      serverTick: 0,
      type: "INITIAL_STATE",
      intentId: null,
      payload: { expectedNextDiffSequence: 2, localPlayerId: 1, state: snapshot },
    };
    const confirmed = initializeOnlineConfirmedState(initDiff);
    const gameState = toGameState(confirmed, snapshot, ctx, null, null);
    expect(gameState.tanks[0]!.bodyAngle).not.toBe(0);
    expect(gameState.match.cameraX).toBe(0);
    expect(gameState.terrain.width).toBe(2400);
  });

  it("smoothly interpolates local predicted movement across its full duration", () => {
    let now = 1000;
    const testCtx = {
      clock: () => now,
      generateIntentId: () => "intent-1",
      gameContent: testGameContent,
    };
    const confirmed = initializeOnlineConfirmedState(createInitialDiff(1));
    const initialX = confirmed.state.tanks[0]!.position.x; // 200

    const predicted = predictOnlineMovement(confirmed, "move-1", 1, { direction: 1 }, now);
    const destX = predicted.pendingPredictions[0]!.predictedMovement!.to.x; // 224

    // At t=0ms (progress = 0)
    now = 1000;
    const stateT0 = projectOnlineRenderState(predicted, testCtx);
    expect(stateT0.tanks[0]!.position.x).toBe(initialX);

    // At t=50ms (progress = 0.5)
    now = 1050;
    const stateT50 = projectOnlineRenderState(predicted, testCtx);
    expect(stateT50.tanks[0]!.position.x).toBeCloseTo(initialX + (destX - initialX) * 0.5, 0);

    // At t=100ms (progress = 1.0)
    now = 1100;
    const stateT100 = projectOnlineRenderState(predicted, testCtx);
    expect(stateT100.tanks[0]!.position.x).toBe(destX);
  });

  it("maintains smooth visual interpolation even after early server confirmation arrives", () => {
    let now = 1000;
    const testCtx = {
      clock: () => now,
      generateIntentId: () => "intent-1",
      gameContent: testGameContent,
    };
    let confirmed = initializeOnlineConfirmedState(createInitialDiff(1));
    const initialX = confirmed.state.tanks[0]!.position.x; // 200

    // Client predicts at t=1000ms (100ms duration)
    confirmed = predictOnlineMovement(confirmed, "move-1", 1, { direction: 1 }, 1000);
    const destX = confirmed.pendingPredictions[0]!.predictedMovement!.to.x; // 224

    // Server sends MOVEMENT_SEGMENT confirmation early at t=1020ms
    now = 1020;
    const serverSegmentDiff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 2,
      serverTick: 1,
      type: "MOVEMENT_SEGMENT",
      intentId: "move-1",
      payload: {
        playerId: 1,
        tankEntityId: confirmed.state.tanks[0]!.entityId,
        from: { x: initialX, y: 400 },
        to: { x: destX, y: 400 },
        movementPath: [{ x: initialX, y: 400 }, { x: destX, y: 400 }],
        fuelBefore: 240,
        fuelAfter: 216,
        fuelSpent: 24,
        partial: false,
        startedServerTick: 1,
        endedServerTick: 4,
        durationTicks: 3,
      },
    };

    const confirmedAfterDiff = applyOnlineStateDiffResponse(confirmed, serverSegmentDiff, testCtx);

    // Prediction should not be cancelled at t=1050ms
    now = 1050;
    const stateT50 = projectOnlineRenderState(confirmedAfterDiff, testCtx);
    expect(stateT50.tanks[0]!.position.x).toBeCloseTo(initialX + (destX - initialX) * 0.5, 0);

    // At t=1100ms, reaches final destination
    now = 1100;
    const stateT100 = projectOnlineRenderState(confirmedAfterDiff, testCtx);
    expect(stateT100.tanks[0]!.position.x).toBe(destX);
  });

  it("resets active tank fuel to maxFuel on TURN_TRANSITION diff", () => {
    let confirmed = initializeOnlineConfirmedState(createInitialDiff(1));
    // Set tank 2 fuel low
    confirmed.state.tanks[1]!.fuel = 20;

    const turnDiff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 2,
      serverTick: 10,
      type: "TURN_TRANSITION",
      intentId: null,
      payload: {
        phase: "AIMING",
        activePlayerId: 2,
        turnNumber: 2,
        turnEndsAtServerTick: 900,
        matchEndsAtServerTick: 5400,
        wind: 0,
      },
    };

    const nextState = applyOnlineStateDiffResponse(confirmed, turnDiff, ctx);
    const tank2 = nextState.state.tanks.find((t) => t.playerId === 2)!;
    expect(tank2.fuel).toBe(tank2.maxFuel);
  });

  it("decrements limited weapon ammo on PROJECTILE_RESOLUTION diff", () => {
    let confirmed = initializeOnlineConfirmedState(createInitialDiff(1));
    const tank1 = confirmed.state.tanks.find((t) => t.playerId === 1)!;
    tank1.weaponAmmo = { basicShell: -1, cluster: 1 };

    const projDiff: OnlineDiffResponseDto = {
      gameSessionId: "session-123",
      sequence: 2,
      serverTick: 10,
      type: "PROJECTILE_RESOLUTION",
      intentId: "fire-1",
      payload: {
        projectileEntityId: 50,
        ownerPlayerId: 1,
        projectileDefinitionId: "cluster",
        launch: { x: 200, y: 388 },
        impact: { x: 600, y: 400 },
        damagedTanks: [],
        trajectory: [{ x: 200, y: 388 }, { x: 600, y: 400 }],
        subMunitions: [],
      },
    };

    const nextState = applyOnlineStateDiffResponse(confirmed, projDiff, ctx);
    const updatedTank1 = nextState.state.tanks.find((t) => t.playerId === 1)!;
    expect(updatedTank1.weaponAmmo!["cluster"]).toBe(0);
    expect(updatedTank1.weaponAmmo!["basicShell"]).toBe(-1);
  });
});
