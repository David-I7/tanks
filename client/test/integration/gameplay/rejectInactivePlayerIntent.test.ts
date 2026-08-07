import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForErrorReply,
} from "../harnessUtils";

describe("Inactive Player Intent Rejection", () => {
  it("rejects intent sent by inactive player whose turn it is not", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      sendIntent(ctx.inactiveClient!, ctx.gameSessionId!, {
        intentId: `test-inactive-${Date.now()}`,
        type: "MOVE",
        playerId: ctx.inactiveClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: "RIGHT" },
      });

      const errorReply = await waitForErrorReply(ctx.inactiveClient!, 5000);
      expect(errorReply).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
