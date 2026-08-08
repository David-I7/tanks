import { describe, it, expect } from "vitest";
import type { GameEvent } from "../../../../src/api/ws/dto/game/GameEventDto";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("Opponent Game Leave Notification", () => {
  it("broadcasts GAME_LEAVE to the connected player when their opponent leaves", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const activePlayer = ctx.activeClient!;
      const disconnectingPlayer = ctx.inactiveClient!;
      const disconnectEventType: GameEvent["type"] = "GAME_LEAVE";

      disconnectingPlayer.client.deactivate();

      const disconnectEvent: GameEvent = await waitForTopicMessage(
        activePlayer,
        disconnectEventType,
        5000,
      );

      expect(disconnectEvent).toBeDefined();
      expect(disconnectEvent.type).toBe(disconnectEventType);
      expect(disconnectEvent.payload.triggeredBy).toBe(
        disconnectingPlayer.username,
      );
      expect(disconnectEvent.payload.hostId).toBe(null);
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
