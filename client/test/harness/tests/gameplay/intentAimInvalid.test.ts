import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext, sendIntent, sleep } from "../../harnessUtils";

describe("[GAMEPLAY] Invalid Payload AIM Intent", () => {
  it("rejects/ignores AIM intent with out-of-range power payload", async () => {
    const ctx = await createIsolatedTestContext({ game: true });
    try {
      const diffsBefore = ctx.activeClient!.receivedDiffs.length;
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-aim-invalid-${Date.now()}`,
        type: 'AIM',
        playerId: 1,
        lastConfirmedDiffSequence: 2,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 999999 },
      });
      await sleep(500);
      const newAimDiffs = ctx.activeClient!.receivedDiffs
        .slice(diffsBefore)
        .filter((d) => d.type === 'AIM_UPDATE');
      expect(newAimDiffs.length).toBe(0);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
