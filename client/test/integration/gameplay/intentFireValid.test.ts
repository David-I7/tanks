import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  sleep,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Valid FIRE Intent", () => {
  it("processes FIRE intent for active player", async () => {
    const ctx = await createIsolatedTestContext({ setupType: "game" });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-fire-${Date.now()}`,
        type: "FIRE",
        playerId: 1,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 300 },
      });
      await waitForTopicMessage(
        ctx.activeClient!,
        "PROJECTILE_RESOLUTION",
        500,
      );
      expect(
        ctx.activeClient!.receivedReplies.length +
          ctx.activeClient!.receivedTopicMessages.length,
      ).toBeGreaterThan(0);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
