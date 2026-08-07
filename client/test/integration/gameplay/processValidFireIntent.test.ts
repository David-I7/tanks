import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Valid FIRE Intent", () => {
  it("processes FIRE intent for active player and generates projectile resolution", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-fire-${Date.now()}`,
        type: "FIRE",
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 300 },
      });

      const resolutionEvent = await waitForTopicMessage(
        ctx.activeClient!,
        "PROJECTILE_RESOLUTION",
        5000,
      );

      expect(resolutionEvent).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
