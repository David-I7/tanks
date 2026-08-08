import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForErrorReply,
} from "../../harnessUtils";

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

      const errorReply = await waitForErrorReply(player1, 500);
      expect(errorReply).toBeDefined();
      expect(errorReply).toEqual(
        expect.objectContaining({
          detail: "User is not idle.",
          status: 401,
          title: "Unauthorized",
          instance: "/lobby/create/private",
        }),
      );
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
