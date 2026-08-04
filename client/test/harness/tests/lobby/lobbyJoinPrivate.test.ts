import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext, waitForReply, setupLobbyTopicSubscription, sleep } from "../../harnessUtils";

describe("[LOBBY] Join Private Lobby", () => {
  it("allows opponent to join a private lobby", async () => {
    const ctx = await createIsolatedTestContext({ connect: true });
    try {
      ctx.clientA!.client.publish({
        destination: '/app/lobby/create/private',
        body: JSON.stringify({ tankId: 'vanguard-cyber' }),
      });
      const lobbyReply = await waitForReply(ctx.clientA!, 'LOBBY_CREATED');
      const lobbyId = lobbyReply.payload?.id || lobbyReply.payload?.lobbyId;

      ctx.clientB!.client.publish({
        destination: `/app/lobby/join/private/${lobbyId}`,
        body: JSON.stringify({ tankId: 'vanguard-cyber' }),
      });

      const reply = await waitForReply(ctx.clientB!, 'LOBBY_JOINED');
      const joinedLobbyId = reply.payload?.id || reply.payload?.lobbyId;
      expect(joinedLobbyId).toBe(lobbyId);

      setupLobbyTopicSubscription(ctx.clientB!, lobbyId);
      await sleep(300);
      expect(ctx.clientB!.subscriptions.has(`/topic/lobby/${lobbyId}`)).toBe(true);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
