import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  sleep,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Valid MOVE Intent", () => {
  it("processes MOVE intent for active player", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-move-${Date.now()}`,
        type: "MOVE",
        playerId: 1,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: 1 },
      });
      await waitForTopicMessage(ctx.activeClient!, "MOVEMENT_SEGMENT", 500);
      expect(
        ctx.activeClient!.receivedReplies.length +
          ctx.activeClient!.receivedTopicMessages.length,
      ).toBeGreaterThan(0);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
