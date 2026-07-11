import assert from "node:assert/strict";

import type {
  EndpointSubscription,
  Message,
  PublishParams,
  SubscriptionCleanup,
} from "../src/api/ws/TanksWebSocketClient";
import type {
  OnlineDiffEnvelope,
  OnlinePlayerIntentEnvelope,
} from "../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import { createOnlineGameplayTransport } from "../src/game/online/OnlineGameplayTransport";

type CapturedSubscription = EndpointSubscription<unknown> & {
  cleanup: SubscriptionCleanup;
  cleanupCalls: number;
  cleaned: boolean;
};

function createClient() {
  const publishes: PublishParams[] = [];
  const subscriptions: CapturedSubscription[] = [];

  return {
    publishes,
    subscriptions,
    client: {
      publish(params: PublishParams): void {
        publishes.push(params);
      },
      subscribe<Data>(params: EndpointSubscription<Data>): SubscriptionCleanup {
        const subscription = {
          ...(params as EndpointSubscription<unknown>),
          cleanupCalls: 0,
          cleaned: false,
          cleanup: () => {
            subscription.cleanupCalls += 1;
            subscription.cleaned = true;
          },
        } satisfies CapturedSubscription;
        subscriptions.push(subscription);
        return subscription.cleanup;
      },
    },
  };
}

function message(body: unknown): Message<unknown> {
  return {
    command: "MESSAGE",
    headers: {},
    isBinaryBody: false,
    body,
  };
}

const intent = {
  protocolVersion: "online-gameplay.v1",
  gameSessionId: "game-123",
  playerId: 1,
  intentId: "intent-1",
  lastConfirmedDiffSequence: 7,
  lastConfirmedDiffServerTick: 210,
  type: "MOVE",
  payload: { direction: 1 },
} satisfies OnlinePlayerIntentEnvelope;

const diff = {
  protocolVersion: "online-gameplay.v1",
  gameSessionId: "game-123",
  sequence: 8,
  serverTick: 240,
  type: "MOVEMENT_SEGMENT",
  intentId: "intent-1",
  payload: {
    intentId: "intent-1",
    playerId: 1,
    tankEntityId: 10,
    from: { x: 50, y: 120 },
    to: { x: 55, y: 120 },
    fuelBefore: 100,
    fuelAfter: 95,
    fuelSpent: 5,
    startedServerTick: 240,
    endedServerTick: 255,
    durationTicks: 15,
  },
} satisfies OnlineDiffEnvelope;

const otherGameDiff = {
  ...diff,
  gameSessionId: "other-game",
} satisfies OnlineDiffEnvelope;

{
  const { client, publishes } = createClient();
  const transport = createOnlineGameplayTransport({
    client,
    gameSessionId: "game-123",
  });

  transport.sendPlayerIntent(intent);
  transport.requestResyncState();

  assert.deepEqual(publishes[0], {
    destination: "/app/game/:id/send",
    id: "game-123",
    body: intent,
  });
  assert.deepEqual(publishes[1], {
    destination: "/app/game/:id/resync",
    id: "game-123",
  });
}

{
  const { client, subscriptions } = createClient();
  const transport = createOnlineGameplayTransport({
    client,
    gameSessionId: "game-123",
  });
  const seen: OnlineDiffEnvelope[] = [];

  const unsubscribe = transport.subscribeToStateDiffs((stateDiff) => {
    seen.push(stateDiff);
  });

  assert.equal(subscriptions[0]?.destination, "/user/queue/replies");
  assert.equal(subscriptions[1]?.destination, "/topic/game/:id");
  assert.equal(subscriptions[1]?.id, "game-123");

  subscriptions[0]?.onMessage(message(diff));
  subscriptions[0]?.onMessage(message(otherGameDiff));
  subscriptions[0]?.onMessage(
    message({
      protocolVersion: "online-gameplay.v1",
      gameSessionId: "game-123",
      type: "MOVEMENT_SEGMENT",
    }),
  );
  subscriptions[1]?.onMessage(message({ type: "GAME_CONNECT" }));

  assert.deepEqual(seen, [diff]);

  unsubscribe();
  assert.equal(subscriptions[0]?.cleaned, true);
  assert.equal(subscriptions[1]?.cleaned, true);
}

{
  const { client, subscriptions } = createClient();
  const transport = createOnlineGameplayTransport({
    client,
    gameSessionId: "game-123",
  });

  const unsubscribe = transport.subscribeToStateDiffs(() => {});
  transport.destroy();
  unsubscribe();

  assert.equal(subscriptions[0]?.cleaned, true);
  assert.equal(subscriptions[1]?.cleaned, true);
  assert.equal(subscriptions[0]?.cleanupCalls, 1);
  assert.equal(subscriptions[1]?.cleanupCalls, 1);
}

{
  const { client, subscriptions } = createClient();
  const transport = createOnlineGameplayTransport({
    client,
    gameSessionId: "game-123",
  });
  const seen: string[] = [];

  const unsubscribe = transport.subscribeToGameEvents((event) => {
    seen.push(event.type);
  });

  assert.equal(subscriptions[0]?.destination, "/user/queue/replies");
  assert.equal(subscriptions[1]?.destination, "/topic/game/:id");
  assert.equal(subscriptions[1]?.id, "game-123");

  subscriptions[0]?.onMessage(message({ type: "GAME_CONNECT", payload: { playerName: "Ada" } }));
  subscriptions[0]?.onMessage(message({
    type: "GAME_STARTED",
    payload: {
      gameSessionId: "game-123",
      playerA: "Ada",
      playerB: "Grace",
      gameStartedAt: "2026-01-01T00:00:00Z",
      gameplayDefinitionVersion: "online-gameplay-definitions.v1",
      localPlayerId: 1,
    },
  }));
  subscriptions[0]?.onMessage(message(diff));
  subscriptions[1]?.onMessage(message({ type: "GAME_DISCONNECT", payload: { playerName: "Grace" } }));

  unsubscribe();

  assert.deepEqual(seen, ["GAME_CONNECT", "GAME_STARTED", "GAME_DISCONNECT"]);
  assert.equal(subscriptions[0]?.cleanupCalls, 1);
  assert.equal(subscriptions[1]?.cleanupCalls, 1);
}
