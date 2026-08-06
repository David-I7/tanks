import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForReply,
} from "../harnessUtils";

describe("Game Disconnect / Resync", () => {
  it("handles player resync request", async () => {
    const ctx = await createIsolatedTestContext({ setupType: "game" });
    try {
      expect(ctx.gameSessionId).toBeDefined();
      ctx.hostClient!.client.publish({
        destination: `/app/game/${ctx.gameSessionId}/resync`,
        body: JSON.stringify({}),
      });
      await waitForReply(ctx.hostClient!, "RESYNC_STATE");
    } finally {
      teardownTestContext(ctx);
    }
  });
});
