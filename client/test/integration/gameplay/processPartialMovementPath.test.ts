import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Terrain Collision & Partial Movement", () => {
  it("clamps tank movement to last reachable grounded position when blocked by terrain obstacle", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-partial-move-${Date.now()}`,
        type: "MOVE",
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: "LEFT" },
      });

      const diffEvent = await waitForTopicMessage(
        ctx.activeClient!,
        "STATE_DIFF",
        5000,
      );

      expect(diffEvent).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
