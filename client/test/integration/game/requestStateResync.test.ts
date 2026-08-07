import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForReply,
} from "../harnessUtils";

describe("State Resync Request", () => {
  it("returns full authoritative resync state when client requests resync on sequence gap", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const activePlayer = ctx.activeClient!;

      activePlayer.client.publish({
        destination: `/app/game/${ctx.gameSessionId}/resync`,
        body: JSON.stringify({}),
      });

      const resyncReply = await waitForReply(activePlayer, "RESYNC_STATE", 5000);
      expect(resyncReply).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
