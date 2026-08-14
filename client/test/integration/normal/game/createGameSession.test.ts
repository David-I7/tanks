import { describe, it, expect } from "vitest";
import type { GameEvent } from "../../../../src/api/ws/dto/game/GameEventDto";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForReply,
} from "../../harnessUtils";

describe("Create Game Session", () => {
  it("creates a game session from lobby when host sends creation request", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "lobby",
      playerCount: 2,
    });
    try {
      const expectedEventType: GameEvent["type"] = "GAME_CREATED";

      ctx.hostClient!.client.publish({
        destination: "/app/game/create",
        body: JSON.stringify({}),
      });

      const reply: GameEvent = await waitForReply(
        ctx.hostClient!,
        expectedEventType,
      );
      const gameSessionId = reply.payload?.id;
      ctx.gameSessionId = gameSessionId;
      expect(gameSessionId).toBeDefined();
      expect(reply.type).toBe(expectedEventType);
      expect(reply.payload.hostId).toBe(ctx.hostClient!.playerId);
      expect(reply.payload.triggeredBy).toBe(ctx.hostClient!.username);
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
