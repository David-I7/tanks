import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForReply,
  setupLobbyTopicSubscription,
  sleep,
} from "../harnessUtils";

describe("Quick Match Lobby", () => {
  it("handles quick match queue request", async () => {
    const ctx = await createIsolatedTestContext({ setupType: "connect" });
    try {
      ctx.playerClients[0]!.client.publish({
        destination: "/app/lobby/quick-match",
        body: JSON.stringify({ tankId: "vanguard-cyber" }),
      });

      const reply = await waitForReply(ctx.playerClients[0]!, "LOBBY_CREATED");
      const quickMatchLobbyId = reply.payload?.id || reply.payload?.lobbyId;
      expect(quickMatchLobbyId).toBeDefined();

      if (quickMatchLobbyId) {
        await setupLobbyTopicSubscription(
          ctx.playerClients[0]!,
          quickMatchLobbyId,
        );
      }
    } finally {
      teardownTestContext(ctx);
    }
  });
});
