import { describe, it, expect } from "vitest";
import type {
  ChatEventType,
  ChatEvent,
} from "../../../../src/api/ws/dto/chat/ChatEventDto";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("Lobby Chat Broadcasting", () => {
  it("broadcasts chat messages to all players inside a private lobby", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "lobby",
      playerCount: 2,
    });
    try {
      const sender = ctx.playerClients[0]!;
      const receiver = ctx.playerClients[1]!;
      const chatType: ChatEventType = "CHAT_MESSAGE";
      const testMessage = "Hello from integration test!";

      sender.client.publish({
        destination: `/app/chat/${ctx.lobbyId}/send`,
        body: JSON.stringify({
          type: chatType,
          message: testMessage,
        }),
      });

      const chatBroadcast: ChatEvent = await waitForTopicMessage(
        receiver,
        chatType,
        500,
      );

      expect(chatBroadcast).toBeDefined();
      if (chatBroadcast.type === "CHAT_MESSAGE") {
        expect(chatBroadcast.payload.message).toBe(testMessage);
        expect(chatBroadcast.payload.triggeredBy).toBe(sender.username);
      }
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
