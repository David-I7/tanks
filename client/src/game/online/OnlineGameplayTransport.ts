import type {
  GameSessionId,
  OnlineDiffResponseDto,
  OnlinePlayerIntentRequestDto,
} from "../../api/ws/dto/gameplay/OnlineGameplayProtocol";
import { isOnlineDiffResponseDto } from "../../api/ws/dto/gameplay/OnlineGameplayProtocol";
import type {
  EndpointSubscription,
  Message,
  PublishParams,
  SubscriptionCleanup,
} from "../../api/ws/TanksWebSocketClient";
import type { GameEvent } from "../../api/ws/dto/game/GameEventDto";

type OnlineGameplayClient = {
  send(params: PublishParams): void;
  subscribe<Data>(params: EndpointSubscription<Data>): SubscriptionCleanup;
};

export type OnlineGameplayTransport = {
  sendPlayerIntent(intent: OnlinePlayerIntentRequestDto): void;
  requestResyncState(): void;
  subscribeToStateDiffs(listener: (diff: OnlineDiffResponseDto) => void): void;
  subscribeToGameEvents(listener: (event: GameEvent) => void): void;
  destroy(): void;
};

export function createOnlineGameplayTransport(options: {
  client: OnlineGameplayClient;
  gameSessionId: GameSessionId;
}): OnlineGameplayTransport {
  const cleanups = new Set<SubscriptionCleanup>();

  const subscribeToGameTopic = <Data>(
    onMessage: (message: Message<Data>) => void,
  ): SubscriptionCleanup =>
    options.client.subscribe<Data>({
      destination: "/topic/game/:id",
      id: options.gameSessionId,
      onMessage,
    });

  return {
    sendPlayerIntent(intent: OnlinePlayerIntentRequestDto): void {
      options.client.send({
        destination: "/app/game/:id/intent",
        id: options.gameSessionId,
        body: intent,
      });
    },

    requestResyncState(): void {
      options.client.send({
        destination: "/app/game/:id/resync",
        id: options.gameSessionId,
      });
    },

    subscribeToStateDiffs(
      listener: (diff: OnlineDiffResponseDto) => void,
    ): SubscriptionCleanup {
      const handleMessage = (message: Message<unknown>) => {
        if (
          isOnlineDiffResponseDto(message.body) &&
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
    },

    subscribeToGameEvents(
      listener: (event: GameEvent) => void,
    ): SubscriptionCleanup {
      const handleMessage = (message: Message<GameEvent | unknown>) => {
        if (!isOnlineDiffResponseDto(message.body)) {
          listener(message.body as GameEvent);
        }
      };

      const replyCleanup = options.client.subscribe<unknown>({
        destination: "/user/queue/replies",
        onMessage: handleMessage,
      });
      const topicCleanup = subscribeToGameTopic<GameEvent>(handleMessage);

      return () => {
        replyCleanup();
        topicCleanup();
      };
    },

    destroy(): void {
      for (const cleanup of cleanups) {
        cleanup();
      }
      cleanups.clear();
    },
  };
}
