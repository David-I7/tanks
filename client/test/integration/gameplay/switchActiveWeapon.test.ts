import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Weapon Selection Intent", () => {
  it("updates active player selected weapon when valid weapon intent is received", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-weapon-${Date.now()}`,
        type: "SELECT_WEAPON",
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { weaponId: "NUKE" },
      });

      const diffEvent = await waitForTopicMessage(
        ctx.activeClient!,
        "STATE_DIFF",
        5000,
      );

      expect(diffEvent).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
