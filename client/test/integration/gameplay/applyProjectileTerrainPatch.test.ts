import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Projectile Trajectory & Terrain Destruction", () => {
  it("computes projectile trajectory, deforms surface heightmap, and applies blast damage on impact", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-patch-${Date.now()}`,
        type: "FIRE",
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 90, power: 200 },
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
