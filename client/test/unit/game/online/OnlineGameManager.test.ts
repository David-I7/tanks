import { describe, it, expect, vi } from "vitest";
import { createOnlineGameManager } from "../../../../src/game/authority/OnlineGameManager";
import type { OnlineGameplayTransport } from "../../../../src/game/online/OnlineGameplayTransport";
import type {
  OnlineDiffResponseDto,
  OnlineDiffBatchResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import { localGameContent } from "../../../../src/game/content/localGameContent";
import { createInitialDiff } from "./mockOnlineTestState";

describe("OnlineGameManager Intent Handling & Batch Processing", () => {
  it("initializes successfully and reports ready status", () => {
    let diffListener: (diff: OnlineDiffResponseDto) => void = () => {};
    const mockTransport: OnlineGameplayTransport = {
      sendPlayerIntent: vi.fn(),
      requestResyncState: vi.fn(),
      subscribeToStateDiffs: vi.fn((listener) => {
        diffListener = listener;
        return () => {};
      }),
    };

    const ctx = {
      clock: () => 1000,
      generateIntentId: () => "intent-1",
      gameContent: localGameContent,
    };

    const manager = createOnlineGameManager({ transport: mockTransport, ctx });
    expect(manager.isReady()).toBe(false);

    diffListener(createInitialDiff(1));
    expect(manager.isReady()).toBe(true);
    expect(manager.getState().match.activePlayerId).toBe(1);
  });

  it("submits aim and move actions with throttled intent DTOs", () => {
    const sentIntents: any[] = [];
    let diffListener: (diff: OnlineDiffResponseDto) => void = () => {};

    const mockTransport: OnlineGameplayTransport = {
      sendPlayerIntent: vi.fn((intent) => sentIntents.push(intent)),
      requestResyncState: vi.fn(),
      subscribeToStateDiffs: vi.fn((listener) => {
        diffListener = listener;
        return () => {};
      }),
    };

    let timeMs = 1000;
    const ctx = {
      clock: () => timeMs,
      generateIntentId: vi.fn(() => `intent-${sentIntents.length + 1}`),
      gameContent: localGameContent,
    };

    const manager = createOnlineGameManager({ transport: mockTransport, ctx });
    diffListener(createInitialDiff(1));

    // First aim intent sent immediately
    const aimRes = manager.submitAction({ type: "aim", angle: -Math.PI / 3, power: 450 });
    expect(aimRes).toBe(true);
    expect(sentIntents.length).toBe(1);
    expect(sentIntents[0].type).toBe("AIM");
    expect(sentIntents[0].payload.angle).toBeCloseTo(-Math.PI / 3);

    // Second aim intent within 80ms is throttled (local state updated, network intent not sent)
    const aimRes2 = manager.submitAction({ type: "aim", angle: -Math.PI / 6, power: 500 });
    expect(aimRes2).toBe(true);
    expect(sentIntents.length).toBe(1);

    // Move action sends MOVE intent
    const moveRes = manager.submitAction({ type: "move", direction: 1 });
    expect(moveRes).toBe(true);
    expect(sentIntents.length).toBe(2);
    expect(sentIntents[1].type).toBe("MOVE");

    // Fire action sends FIRE intent immediately without throttling
    const fireRes = manager.submitAction({ type: "fire", angle: -Math.PI / 4, power: 600, projectileSlotId: "basicShell" });
    expect(fireRes).toBe(true);
    expect(sentIntents.length).toBe(3);
    expect(sentIntents[2].type).toBe("FIRE");
  });

  it("clamps out-of-bounds positive aim angle to valid upper semicircle radian range [-Math.PI, 0]", () => {
    const sentIntents: any[] = [];
    let diffListener: (diff: OnlineDiffResponseDto) => void = () => {};

    const mockTransport: OnlineGameplayTransport = {
      sendPlayerIntent: vi.fn((intent) => sentIntents.push(intent)),
      requestResyncState: vi.fn(),
      subscribeToStateDiffs: vi.fn((listener) => {
        diffListener = listener;
        return () => {};
      }),
    };

    const ctx = {
      clock: () => 1000,
      generateIntentId: () => "intent-fire-out-of-bounds",
      gameContent: localGameContent,
    };

    const manager = createOnlineGameManager({ transport: mockTransport, ctx });
    diffListener(createInitialDiff(1));

    // Submit invalid positive angle (pointing into ground) e.g. Math.PI / 2
    manager.submitAction({ type: "fire", angle: Math.PI / 2, power: 500, projectileSlotId: "basicShell" });

    expect(sentIntents.length).toBe(1);
    // Should be clamped to 0 (horizontal right)
    expect(sentIntents[0].payload.angle).toBe(0);
  });

  it("handles batched diffs (OnlineDiffBatchResponseDto) sequentially", () => {
    let diffListener: (diff: any) => void = () => {};
    const mockTransport: OnlineGameplayTransport = {
      sendPlayerIntent: vi.fn(),
      requestResyncState: vi.fn(),
      subscribeToStateDiffs: vi.fn((listener) => {
        diffListener = listener;
        return () => {};
      }),
    };

    const ctx = {
      clock: () => 1000,
      generateIntentId: () => "intent-1",
      gameContent: localGameContent,
    };

    const manager = createOnlineGameManager({ transport: mockTransport, ctx });
    diffListener(createInitialDiff(1));

    const batchDiff: OnlineDiffBatchResponseDto = {
      gameSessionId: "session-123",
      sequence: 2,
      serverTick: 20,
      intentId: "intent-1",
      diffs: [
        {
          gameSessionId: "session-123",
          sequence: 2,
          serverTick: 20,
          type: "AIM_UPDATE",
          intentId: "intent-1",
          payload: { playerId: 1, angle: -Math.PI / 6, power: 400 },
        },
        {
          gameSessionId: "session-123",
          sequence: 3,
          serverTick: 20,
          type: "TURN_TRANSITION",
          intentId: null,
          payload: {
            phase: "AIMING",
            activePlayerId: 2,
            turnNumber: 2,
            turnEndsAtServerTick: 900,
            matchEndsAtServerTick: 5400,
            wind: -5,
          },
        },
      ],
    };

    diffListener(batchDiff);
    const state = manager.getState();
    expect(state.match.activePlayerId).toBe(2);
    expect(state.match.turnNumber).toBe(2);
    expect(state.match.wind).toBe(-5);
  });
});
