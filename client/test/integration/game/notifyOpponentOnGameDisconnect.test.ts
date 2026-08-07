import { describe, it, expect } from "vitest";
import type { GameEvent } from "../../../src/api/ws/dto/game/GameEventDto";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Opponent Game Disconnect Notification", () => {
  it("broadcasts GAME_DISCONNECT to the connected player when their opponent disconnects", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const activePlayer = ctx.activeClient!;
      const disconnectingPlayer = ctx.inactiveClient!;

      disconnectingPlayer.client.deactivate();

      const disconnectEvent: GameEvent = await waitForTopicMessage(
        activePlayer,
        "GAME_DISCONNECT",
        5000,
      );

      expect(disconnectEvent).toBeDefined();
      expect(disconnectEvent.type).toBe("GAME_DISCONNECT");
    } finally {
      teardownTestContext(ctx);
    }
  });
});
