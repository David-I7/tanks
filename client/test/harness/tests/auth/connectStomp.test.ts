import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext } from "../../harnessUtils";

describe("[AUTH] STOMP Connection", () => {
  it("connects STOMP WebSocket clients for both players", async () => {
    const ctx = await createIsolatedTestContext({ connect: true });
    try {
      expect(ctx.clientA).toBeDefined();
      expect(ctx.clientB).toBeDefined();
      expect(ctx.clientA?.client.connected).toBe(true);
      expect(ctx.clientB?.client.connected).toBe(true);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
