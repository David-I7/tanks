import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForErrorReply,
} from "../../harnessUtils";

describe("Non-Existent Lobby Join", () => {
  it("returns error reply when attempting to join a lobby that does not exist", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "connect",
      playerCount: 1,
    });
    try {
      const nonExistentLobbyId = "00000000-0000-0000-0000-000000000000";
      ctx.playerClients[0]!.client.publish({
        destination: `/app/lobby/join/private/${nonExistentLobbyId}`,
        body: JSON.stringify({ tankId: "ignis" }),
      });

      const errorReply = await waitForErrorReply(ctx.playerClients[0]!, 3000);
      expect(errorReply).toBeDefined();
      expect(errorReply).toEqual(
        expect.objectContaining({
          detail: "The lobby with the provided id does not exist.",
          instance: "about:blank",
          status: 404,
          title: "Not Found",
        }),
      );
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
