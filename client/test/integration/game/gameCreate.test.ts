import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForReply,
} from "../harnessUtils";

describe("Create Game Session", () => {
  it("creates a game session from lobby", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      ctx.hostClient!.client.publish({
        destination: "/app/game/create",
        body: JSON.stringify({}),
      });

      const replyA = await waitForReply(ctx.hostClient!, "GAME_CREATED");
      const gameSessionId = replyA.payload?.id || replyA.payload?.gameSessionId;
      expect(gameSessionId).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
