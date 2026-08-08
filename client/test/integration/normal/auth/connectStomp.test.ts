import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
} from "../../harnessUtils";

describe("STOMP Connection", () => {
  it("connects STOMP WebSocket clients for 2 players", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "connect",
      playerCount: 2,
    });
    try {
      expect(ctx.playerClients[0]).toBeDefined();
      expect(ctx.playerClients[1]).toBeDefined();
      expect(ctx.playerClients[0]?.client.connected).toBe(true);
      expect(ctx.playerClients[1]?.client.connected).toBe(true);
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
