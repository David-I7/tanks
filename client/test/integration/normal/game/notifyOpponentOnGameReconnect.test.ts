import { describe, it, expect, afterEach } from "vitest";
import type { GameEvent } from "../../../../src/api/ws/dto/game/GameEventDto";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForTopicMessage,
  setupGameTopicSubscription,
} from "../../harnessUtils";
import { createStompClient } from "../../mockGameHarness";

describe("Opponent Game Reconnect Notification", () => {
  let ctx: Awaited<ReturnType<typeof createIsolatedTestContext>>;

  afterEach(async () => {
    await teardownTestContext(ctx);
  });

  it("broadcasts GAME_CONNECT to all players when a disconnected player reconnects and resumes topic presence", async () => {
    ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    const activePlayer = ctx.activeClient!;
      const disconnectedPlayerInfo = ctx.authData!.players[1]!;
      const disconnectEventType: GameEvent["type"] = "GAME_DISCONNECT";
      const connectEventType: GameEvent["type"] = "GAME_CONNECT";

      ctx
        .inactiveClient!.subscriptions.get(`/topic/game/${ctx.gameSessionId}`)!
        .unsubscribe();
      ctx.inactiveClient!.subscriptions.delete(
        `/topic/game/${ctx.gameSessionId}`,
      );

      const disconnectEvent = (await waitForTopicMessage(
        activePlayer,
        disconnectEventType,
        5000,
      )) as GameEvent;

      expect(disconnectEvent).toBeDefined();
      expect(disconnectEvent.type).toBe(disconnectEventType);
      expect(disconnectEvent.payload.triggeredBy).toBe(
        disconnectedPlayerInfo.username,
      );
      expect(disconnectEvent.payload.hostId).toBe(null);

      await setupGameTopicSubscription(ctx.inactiveClient!, ctx.gameSessionId!);

      ctx.activeClient!.receivedTopicMessages.length = 0;

      const connectEvent: GameEvent = await waitForTopicMessage(
        activePlayer,
        connectEventType,
        5000,
      );

      expect(connectEvent).toBeDefined();
      expect(connectEvent.type).toBe(connectEventType);
      expect(connectEvent.payload.triggeredBy).toBe(
        disconnectedPlayerInfo.username,
      );
      expect(connectEvent.payload.hostId).toBe(ctx.hostClient!.playerId);
  });

  it("broadcasts GAME_CONNECT to all players when a player who left reconnects and resumes topic presence", async () => {
    ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });

    const activePlayer = ctx.activeClient!;
    const leftPlayerInfo = ctx.authData!.players[1]!;
    const leaveEventType: GameEvent["type"] = "GAME_LEAVE";
    const connectEventType: GameEvent["type"] = "GAME_CONNECT";

    await ctx.inactiveClient!.client.deactivate();

    const leaveEvent = (await waitForTopicMessage(
      activePlayer,
      leaveEventType,
      5000,
    )) as GameEvent;

    expect(leaveEvent).toBeDefined();
    expect(leaveEvent.type).toBe(leaveEventType);
    expect(leaveEvent.payload.triggeredBy).toBe(leftPlayerInfo.username);
    expect(leaveEvent.payload.hostId).toBe(null);

    const newClient = await createStompClient(
      leftPlayerInfo.accessToken,
      leftPlayerInfo.username,
      leftPlayerInfo.id,
    );
    ctx.playerClients.push(newClient);

    await setupGameTopicSubscription(newClient, ctx.gameSessionId!);

    ctx.activeClient!.receivedTopicMessages.length = 0;

    const connectEvent: GameEvent = await waitForTopicMessage(
      activePlayer,
      connectEventType,
      5000,
    );

    expect(connectEvent).toBeDefined();
    expect(connectEvent.type).toBe(connectEventType);
    expect(connectEvent.payload.triggeredBy).toBe(leftPlayerInfo.username);
    expect(connectEvent.payload.hostId).toBe(ctx.hostClient!.playerId);
  });
});
