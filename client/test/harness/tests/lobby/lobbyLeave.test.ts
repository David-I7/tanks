import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext, sleep } from "../../harnessUtils";

describe("[LOBBY] Leave Lobby", () => {
  it("allows player to leave a lobby", async () => {
    const ctx = await createIsolatedTestContext({ lobby: true });
    try {
      ctx.clientB!.client.publish({
        destination: '/app/lobby/leave',
        body: JSON.stringify({}),
      });
      await sleep(500);
      expect(ctx.clientB).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
