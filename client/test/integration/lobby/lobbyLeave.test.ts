import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sleep,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Leave Lobby", () => {
  it("allows player to leave a lobby", async () => {
    const ctx = await createIsolatedTestContext({ setupType: "lobby" });
    try {
      ctx.playerClients[1]!.client.publish({
        destination: "/app/lobby/leave",
        body: JSON.stringify({}),
      });
      await waitForTopicMessage(ctx.playerClients[0]!, "LOBBY_DISCONNECT", 5000);
      expect(ctx.playerClients[1]).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
