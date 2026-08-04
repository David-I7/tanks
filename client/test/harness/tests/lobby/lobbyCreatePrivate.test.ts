import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext, waitForReply } from "../../harnessUtils";

describe("[LOBBY] Create Private Lobby", () => {
  it("creates a private lobby via STOMP endpoint", async () => {
    const ctx = await createIsolatedTestContext({ connect: true });
    try {
      ctx.clientA!.client.publish({
        destination: '/app/lobby/create/private',
        body: JSON.stringify({ tankId: 'vanguard-cyber' }),
      });

      const reply = await waitForReply(ctx.clientA!, 'LOBBY_CREATED');
      const lobbyId = reply.payload?.id || reply.payload?.lobbyId;
      expect(lobbyId).toBeDefined();
      expect(reply.type).toBe('LOBBY_CREATED');
    } finally {
      teardownTestContext(ctx);
    }
  });
});
