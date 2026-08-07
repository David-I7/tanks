import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForErrorReply,
} from "../harnessUtils";

describe("Invalid AIM Intent Validation", () => {
  it("rejects AIM intent with out-of-range power payload", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-aim-invalid-${Date.now()}`,
        type: "AIM",
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 9999 },
      });

      const errorReply = await waitForErrorReply(ctx.activeClient!, 5000);
      expect(errorReply).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
