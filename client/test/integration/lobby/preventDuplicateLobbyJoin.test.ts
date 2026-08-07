import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForErrorReply,
} from "../harnessUtils";

describe("Duplicate Lobby Join", () => {
  it("prevents a player from joining another lobby while already inside a lobby", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "lobby",
      playerCount: 2,
    });
    try {
      const player1 = ctx.playerClients[0]!;

      player1.client.publish({
        destination: "/app/lobby/create/private",
        body: JSON.stringify({ tankId: "vanguard-cyber" }),
      });

      const errorReply = await waitForErrorReply(player1, 3000).catch(() => null);
      expect(errorReply).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
