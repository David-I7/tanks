import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext, waitForReply, setupLobbyTopicSubscription, sleep } from "../../harnessUtils";

describe("[LOBBY] Quick Match Lobby", () => {
  it("handles quick match queue request", async () => {
    const ctx = await createIsolatedTestContext({ connect: true });
    try {
      ctx.clientA!.client.publish({
        destination: '/app/lobby/quick-match',
        body: JSON.stringify({ tankId: 'vanguard-cyber' }),
      });

      const reply = await waitForReply(ctx.clientA!, 'LOBBY_CREATED');
      const quickMatchLobbyId = reply.payload?.id || reply.payload?.lobbyId;
      expect(quickMatchLobbyId).toBeDefined();

      if (quickMatchLobbyId) {
        setupLobbyTopicSubscription(ctx.clientA!, quickMatchLobbyId);
        await sleep(200);
      }
    } finally {
      teardownTestContext(ctx);
    }
  });
});
