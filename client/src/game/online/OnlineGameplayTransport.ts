import type {
  GameSessionId,
  OnlineDiffResponseDto,
  OnlinePlayerIntentRequestDto,
} from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import { isOnlineDiffResponseDto } from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type {
  EndpointSubscription,
  Message,
  PublishParams,
  SubscriptionCleanup,
} from "../../api/ws/TanksWebSocketClient";
import type { GameEvent } from "../../api/ws/dto/game/GameEventDto";

export type OnlineGameplayClient = {
  send(params: PublishParams): void;
  subscribe<Data>(params: EndpointSubscription<Data>): SubscriptionCleanup;
};

export type OnlineGameplayTransport = {
  sendPlayerIntent(intent: OnlinePlayerIntentRequestDto): void;
  requestResyncState(): void;
  subscribeToStateDiffs(
    listener: (diff: OnlineDiffResponseDto) => void,
  ): SubscriptionCleanup;
  subscribeToGameEvents(
    listener: (event: GameEvent) => void,
  ): SubscriptionCleanup;
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

  const subscribeToUserReplies = <Data>(
    onMessage: (message: Message<Data>) => void,
  ): SubscriptionCleanup =>
    options.client.subscribe<Data>({
      destination: "/user/queue/replies",
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

      const replyCleanup = subscribeToUserReplies(handleMessage);
      const topicCleanup = subscribeToGameTopic(handleMessage);

      cleanups.add(replyCleanup);
      cleanups.add(topicCleanup);

      return () => {
        replyCleanup();
        topicCleanup();
        cleanups.delete(replyCleanup);
        cleanups.delete(topicCleanup);
      };
    },

    subscribeToGameEvents(
      listener: (event: GameEvent) => void,
    ): SubscriptionCleanup {
      const handleMessage = (message: Message<GameEvent | unknown>) => {
        if (!isOnlineDiffResponseDto(message.body)) {
          listener(message.body as GameEvent);
        }
      };

      const replyCleanup = subscribeToUserReplies(handleMessage);
      const topicCleanup = subscribeToGameTopic<GameEvent>(handleMessage);

      cleanups.add(replyCleanup);
      cleanups.add(topicCleanup);

      return () => {
        replyCleanup();
        topicCleanup();
        cleanups.delete(replyCleanup);
        cleanups.delete(topicCleanup);
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
