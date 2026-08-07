import { describe, it, expect } from "vitest";
import type { GameEvent } from "../../../src/api/ws/dto/game/GameEventDto";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForReply,
} from "../harnessUtils";

describe("Create Game Session", () => {
  it("creates a game session from lobby when host sends creation request", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "lobby",
      playerCount: 2,
    });
    try {
      ctx.hostClient!.client.publish({
        destination: "/app/game/create",
        body: JSON.stringify({}),
      });

      const reply: GameEvent = await waitForReply(
        ctx.hostClient!,
        "GAME_CREATED",
      );
      const gameSessionId = reply.payload?.id;
      expect(gameSessionId).toBeDefined();
      expect(reply.type).toBe("GAME_CREATED");
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
