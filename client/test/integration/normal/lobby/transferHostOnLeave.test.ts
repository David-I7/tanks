import { describe, it, expect } from "vitest";
import type {
  LobbyEventType,
  LobbyEvent,
} from "../../../../src/api/ws/dto/lobby/LobbyEventDto";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("Host Transfer On Leave", () => {
  it("transfers host role to the remaining player when host leaves", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "lobby",
      playerCount: 2,
    });
    try {
      const originalHost = ctx.playerClients[0]!;
      const remainingPlayer = ctx.playerClients[1]!;
      const disconnectType: LobbyEventType = "LOBBY_DISCONNECT";

      originalHost.client.publish({
        destination: "/app/lobby/leave",
        body: JSON.stringify({}),
      });

      const disconnectEvent: LobbyEvent = await waitForTopicMessage(
        remainingPlayer,
        disconnectType,
        500,
      );

      expect(disconnectEvent).toBeDefined();
      expect(disconnectEvent.type).toBe(disconnectType);
      expect(disconnectEvent.payload?.hostId).toBe(remainingPlayer.playerId);
      expect(disconnectEvent.payload?.triggeredBy).toBe(originalHost.username);
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
