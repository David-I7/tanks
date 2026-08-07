import { describe, it, expect } from "vitest";
import type { GameEvent } from "../../../src/api/ws/dto/game/GameEventDto";
import {
  createIsolatedTestContext,
  teardownTestContext,
  setupGameTopicSubscription,
  waitForTopicMessage,
} from "../harnessUtils";
import { createStompClient } from "../mockGameHarness";

describe("Opponent Game Reconnect Notification", () => {
  it("broadcasts GAME_CONNECT to all players when a disconnected player reconnects and resumes topic presence", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const activePlayer = ctx.activeClient!;
      const disconnectedPlayerInfo = ctx.authData!.players[1]!;

      ctx.inactiveClient!.client.deactivate();

      await waitForTopicMessage(activePlayer, "GAME_DISCONNECT", 5000);

      const reconnectedPlayerClient = await createStompClient(
        disconnectedPlayerInfo.accessToken,
        disconnectedPlayerInfo.username,
        disconnectedPlayerInfo.id,
        false,
      );
      ctx.playerClients.push(reconnectedPlayerClient);

      await setupGameTopicSubscription(
        reconnectedPlayerClient,
        ctx.gameSessionId!,
      );

      const connectEvent: GameEvent = await waitForTopicMessage(
        activePlayer,
        "GAME_CONNECT",
        5000,
      );

      expect(connectEvent).toBeDefined();
      expect(connectEvent.type).toBe("GAME_CONNECT");
    } finally {
      teardownTestContext(ctx);
    }
  });
});
