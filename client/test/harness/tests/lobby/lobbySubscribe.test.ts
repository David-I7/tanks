import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext, setupLobbyTopicSubscription, sleep, waitForReply } from "../../harnessUtils";

describe("[LOBBY] Subscribe Lobby Topic", () => {
  it("subscribes host to private lobby topic", async () => {
    const ctx = await createIsolatedTestContext({ connect: true });
    try {
      ctx.clientA!.client.publish({
        destination: '/app/lobby/create/private',
        body: JSON.stringify({ tankId: 'vanguard-cyber' }),
      });

      const reply = await waitForReply(ctx.clientA!, 'LOBBY_CREATED');
      const lobbyId = reply.payload?.id || reply.payload?.lobbyId;
      expect(lobbyId).toBeDefined();

      setupLobbyTopicSubscription(ctx.clientA!, lobbyId);
      await sleep(300);
      expect(ctx.clientA!.subscriptions.has(`/topic/lobby/${lobbyId}`)).toBe(true);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
