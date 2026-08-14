import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForErrorReply,
} from "../../harnessUtils";

describe("Non-Host Game Start Restriction", () => {
  it("prevents a guest player from starting a game session", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "lobby",
      playerCount: 2,
    });
    try {
      const guestPlayer = ctx.playerClients[1]!;

      guestPlayer.client.publish({
        destination: "/app/game/create",
        body: JSON.stringify({}),
      });

      const errorReply = await waitForErrorReply(guestPlayer, 3000);
      expect(errorReply).toBeDefined();
      expect(errorReply).toEqual(
        expect.objectContaining({
          detail: "Player is not the host of the lobby.",
          instance: "/game/create",
          status: 401,
          title: "Unauthorized",
        }),
      );
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
