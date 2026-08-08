import { describe, it, expect } from "vitest";
import type {
  LobbyEventType,
  LobbyEvent,
} from "../../../../src/api/ws/dto/lobby/LobbyEventDto";
import type { GameEvent } from "../../../../src/api/ws/dto/game/GameEventDto";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForReply,
  setupLobbyTopicSubscription,
} from "../../harnessUtils";

describe("QuickMatch Game Start", () => {
  it("triggers game start automatically when 2 players join the quickmatch queue", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "connect",
      playerCount: 2,
    });
    try {
      const player1 = ctx.playerClients[0]!;
      const player2 = ctx.playerClients[1]!;

      // Player 1 creates quick match queue entry
      player1.client.publish({
        destination: "/app/lobby/quick-match",
        body: JSON.stringify({ tankId: "vanguard-cyber" }),
      });

      const lobbyCreatedType: LobbyEventType = "LOBBY_CREATED";
      const reply1: LobbyEvent = await waitForReply(player1, lobbyCreatedType);
      const quickMatchLobbyId = reply1.payload?.id;
      expect(quickMatchLobbyId).toBeDefined();

      await setupLobbyTopicSubscription(player1, quickMatchLobbyId!);

      // Player 2 joins quick match queue and pairs with Player 1's lobby
      player2.client.publish({
        destination: "/app/lobby/quick-match",
        body: JSON.stringify({ tankId: "vanguard-cyber" }),
      });

      const lobbyJoinedType: LobbyEventType = "LOBBY_JOINED";
      const reply2: LobbyEvent = await waitForReply(player2, lobbyJoinedType);
      expect(reply2.payload?.id).toBe(quickMatchLobbyId);

      await setupLobbyTopicSubscription(player2, quickMatchLobbyId!);

      // Host (Player 1) starts the game for the ready quickmatch lobby
      player1.client.publish({
        destination: "/app/game/create",
        body: JSON.stringify({}),
      });

      const gameReply1: GameEvent = await waitForReply(
        player1,
        "GAME_CREATED",
        1000,
      );
      const gameReply2: GameEvent = await waitForReply(
        player2,
        "GAME_CREATED",
        1000,
      );

      expect(gameReply1.payload?.id).toBeDefined();
      expect(gameReply1.payload?.id).toBe(gameReply2.payload?.id);
      ctx.gameSessionId = gameReply1.payload?.id;
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
