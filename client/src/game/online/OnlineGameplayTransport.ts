import type {
  GameSessionId,
  OnlineDiffEnvelope,
  OnlinePlayerIntentEnvelope,
} from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import { isOnlineDiffEnvelope } from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type {
  EndpointSubscription,
  Message,
  PublishParams,
  SubscriptionCleanup,
} from "../../api/ws/TanksWebSocketClient";
import type { GameEvent } from "../../api/ws/dto/game/GameEventDto";

type OnlineGameplayClient = {
  publish(params: PublishParams): void;
  subscribe<Data>(params: EndpointSubscription<Data>): SubscriptionCleanup;
};

export type OnlineGameplayTransport = {
  sendPlayerIntent(intent: OnlinePlayerIntentEnvelope): void;
  requestResyncState(): void;
  subscribeToStateDiffs(
    listener: (diff: OnlineDiffEnvelope) => void,
  ): SubscriptionCleanup;
  subscribeToGameEvents(listener: (event: GameEvent) => void): SubscriptionCleanup;
  destroy(): void;
};

export function createOnlineGameplayTransport(options: {
  client: OnlineGameplayClient;
  gameSessionId: GameSessionId;
}): OnlineGameplayTransport {
  const cleanups = new Set<SubscriptionCleanup>();

  const trackCleanup = (cleanup: SubscriptionCleanup): SubscriptionCleanup => {
    let active = true;
    const trackedCleanup = () => {
      if (!active) return;
      active = false;
      cleanups.delete(trackedCleanup);
      cleanup();
    };
    cleanups.add(trackedCleanup);
    return trackedCleanup;
  };

  const subscribeToGameTopic = <Data>(
    onMessage: (message: Message<Data>) => void,
  ): SubscriptionCleanup =>
    options.client.subscribe<Data>({
      destination: "/topic/game/:id",
      id: options.gameSessionId,
      onMessage,
    });

  return {
    sendPlayerIntent(intent: OnlinePlayerIntentEnvelope): void {
      options.client.publish({
        destination: "/app/game/:id/intent",
        id: options.gameSessionId,
        body: intent,
      });
    },

    requestResyncState(): void {
      options.client.publish({
        destination: "/app/game/:id/resync",
        id: options.gameSessionId,
      });
    },

    subscribeToStateDiffs(
      listener: (diff: OnlineDiffEnvelope) => void,
    ): SubscriptionCleanup {
      const handleMessage = (message: Message<unknown>) => {
        if (
          isOnlineDiffEnvelope(message.body) &&
          message.body.gameSessionId === options.gameSessionId
        ) {
          listener(message.body);
        }
      };

      const replyCleanup = options.client.subscribe<unknown>({
        destination: "/user/queue/replies",
        onMessage: handleMessage,
      });
      const topicCleanup = subscribeToGameTopic(handleMessage);

      return trackCleanup(() => {
        replyCleanup();
        topicCleanup();
      });
    },

    subscribeToGameEvents(listener: (event: GameEvent) => void): SubscriptionCleanup {
      const handleMessage = (message: Message<GameEvent | unknown>) => {
        if (!isOnlineDiffEnvelope(message.body)) {
          listener(message.body as GameEvent);
        }
      };

      const replyCleanup = options.client.subscribe<unknown>({
        destination: "/user/queue/replies",
        onMessage: handleMessage,
      });
      const topicCleanup = subscribeToGameTopic<GameEvent>(handleMessage);

      return trackCleanup(() => {
        replyCleanup();
        topicCleanup();
      });
    },

    destroy(): void {
      for (const cleanup of cleanups) {
        cleanup();
      }
      cleanups.clear();
    },
  };
}
