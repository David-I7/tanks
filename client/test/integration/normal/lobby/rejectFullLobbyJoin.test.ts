import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForErrorReply,
} from "../../harnessUtils";

describe("Full Lobby Join", () => {
  it("rejects join attempt when lobby already has maximum players", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "lobby",
      playerCount: 3,
    });
    try {
      const player3 = ctx.playerClients[2]!;
      const lobbyId = ctx.lobbyId!;

      player3.client.publish({
        destination: `/app/lobby/join/private/${lobbyId}`,
        body: JSON.stringify({ tankId: "terra" }),
      });

      const errorReply = await waitForErrorReply(player3, 500);
      expect(errorReply).toBeDefined();
      expect(errorReply).toEqual(
        expect.objectContaining({
          detail: "Lobby is full.",
          status: 400,
          title: "Bad Request",
          instance: `/lobby/join/private/${lobbyId}`,
        }),
      );
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
