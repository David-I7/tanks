import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext, sendIntent, sleep } from "../../harnessUtils";

describe("[GAMEPLAY] Valid AIM Intent", () => {
  it("processes AIM intent for active player", async () => {
    const ctx = await createIsolatedTestContext({ game: true });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-aim-${Date.now()}`,
        type: 'AIM',
        playerId: 1,
        lastConfirmedDiffSequence: 2,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 300 },
      });
      await sleep(1000);
      expect(ctx.activeClient!.receivedReplies.length + ctx.activeClient!.receivedDiffs.length).toBeGreaterThan(0);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
