import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForReply,
} from "../harnessUtils";

describe("Inactive Player Intent Rejection", () => {
  it("rejects intent sent by inactive player", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      sendIntent(ctx.inactiveClient!, ctx.gameSessionId!, {
        intentId: `test-inactive-${Date.now()}`,
        type: "MOVE",
        playerId: 2,
        lastConfirmedDiffSequence: 2,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: 1 },
      });
      const rejection = await waitForReply(
        ctx.inactiveClient!,
        "INTENT_REJECTION",
      );
      expect(rejection).toBeDefined();
      expect(rejection.type).toBe("INTENT_REJECTION");
    } finally {
      teardownTestContext(ctx);
    }
  });
});
