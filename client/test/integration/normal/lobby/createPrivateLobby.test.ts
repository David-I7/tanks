import { describe, it, expect } from "vitest";
import type {
  LobbyEventType,
  LobbyEvent,
} from "../../../../src/api/ws/dto/lobby/LobbyEventDto";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForReply,
  setupLobbyTopicSubscription,
} from "../../harnessUtils";

describe("Private Lobby Creation", () => {
  it("creates a private lobby when host sends a valid request", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "connect",
      playerCount: 1,
    });
    try {
      const hostClient = ctx.playerClients[0]!;
      const expectedEventType: LobbyEventType = "LOBBY_CREATED";

      hostClient.client.publish({
        destination: "/app/lobby/create/private",
        body: JSON.stringify({ tankId: "vanguard-cyber" }),
      });

      const reply: LobbyEvent = await waitForReply(
        hostClient,
        expectedEventType,
      );
      const lobbyId = reply.payload?.id;
      expect(lobbyId).toBeDefined();
      expect(reply.payload?.hostId).toBe(hostClient.playerId);
      expect(reply.payload?.triggeredBy).toBe(hostClient.username);

      await setupLobbyTopicSubscription(hostClient, lobbyId);
      expect(hostClient.subscriptions.has(`/topic/lobby/${lobbyId}`)).toBe(
        true,
      );
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
