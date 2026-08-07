import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForTopicMessage,
} from "../harnessUtils";

describe("Game Forfeit", () => {
  it("concludes game and declares opponent as winner when player forfeits", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const forfeitingPlayer = ctx.inactiveClient!;
      const remainingPlayer = ctx.activeClient!;

      forfeitingPlayer.client.publish({
        destination: `/app/game/${ctx.gameSessionId}/forfeit`,
        body: JSON.stringify({}),
      });

      const forfeitEvent = await waitForTopicMessage(
        remainingPlayer,
        "GAME_OVER",
        5000,
      );

      expect(forfeitEvent).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
