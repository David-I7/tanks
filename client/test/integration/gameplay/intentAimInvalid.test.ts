import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  sleep,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Invalid Payload AIM Intent", () => {
  it("rejects/ignores AIM intent with out-of-range power payload", async () => {
    const ctx = await createIsolatedTestContext({ setupType: "game" });
    try {
      const diffsBefore = ctx.activeClient!.receivedTopicMessages.length;
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-aim-invalid-${Date.now()}`,
        type: "AIM",
        playerId: 1,
        lastConfirmedDiffSequence: 2,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 999999 },
      });
      await sleep(300);
      const newAimDiffs = ctx
        .activeClient!.receivedTopicMessages.slice(diffsBefore)
        .filter((d) => d.type === "AIM_UPDATE");
      expect(newAimDiffs.length).toBe(0);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
