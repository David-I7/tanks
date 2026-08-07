import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Turn Timer Expiration", () => {
  it("automatically switches turn when active player turn timer expires", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const activePlayer = ctx.activeClient!;

      const turnSwitchEvent = await waitForTopicMessage(
        activePlayer,
        "TURN_SWITCH",
        35000,
      );

      expect(turnSwitchEvent).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
