import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext, sendIntent, sleep } from "../../harnessUtils";

describe("[GAMEPLAY] Valid MOVE Intent", () => {
  it("processes MOVE intent for active player", async () => {
    const ctx = await createIsolatedTestContext({ game: true });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-move-${Date.now()}`,
        type: 'MOVE',
        playerId: 1,
        lastConfirmedDiffSequence: 2,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: 1 },
      });
      await sleep(1000);
      expect(ctx.activeClient!.receivedReplies.length + ctx.activeClient!.receivedDiffs.length).toBeGreaterThan(0);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
