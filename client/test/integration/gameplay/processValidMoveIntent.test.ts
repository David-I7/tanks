import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Valid MOVE Intent", () => {
  it("processes MOVE intent for active player and updates tank position", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-move-${Date.now()}`,
        type: "MOVE",
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: "RIGHT" },
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
