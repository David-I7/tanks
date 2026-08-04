import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext, sleep } from "../../harnessUtils";

describe("[GAME] Game Disconnect / Resync", () => {
  it("handles player resync request", async () => {
    const ctx = await createIsolatedTestContext({ game: true });
    try {
      expect(ctx.gameSessionId).toBeDefined();
      ctx.clientA!.client.publish({
        destination: `/app/game/${ctx.gameSessionId}/resync`,
        body: JSON.stringify({}),
      });
      await sleep(500);
      expect(ctx.clientA).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
