import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Valid AIM Intent", () => {
  it("processes AIM intent for active player", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-aim-${Date.now()}`,
        type: "AIM",
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 50 },
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
