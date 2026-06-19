import {
  Client,
  StompHeaders,
  type IMessage,
  type IPublishParams,
} from "@stomp/stompjs";
import type RefreshResponseDto from "../http/dto/RefreshResponseDto";
import type ProblemDetailDto from "../http/dto/ProblemDetailDto";
import { JSONError } from "../../errors/JSONError";
import type { WebSocketEventResponseDto } from "./dto/WebSocketEventResponseDto";

export type SubscriptionCleanup = () => void;

export type EndpointSubscription<Data = string> = {
  destination:
  | "/topic/lobby/:id"
  | "/topic/game/:id"
  | "/user/queue/errors"
  | "/user/queue/replies";
  id?: string | number;
  onMessage: (message: Message<Data>) => void;
  subscriptionHeaders?: StompHeaders;
};

export type PublishParams = {
  destination:
  | "/app/chat/:id/send"
  | "/app/game/:id/send"
  | "/app/game/create"
  | "/app/lobby/create/private"
  | "/app/lobby/quick-match"
  | "/app/lobby/join/private/:id";

  id?: string | number;

  headers?: StompHeaders;

  body?: string | Record<string, any>;

  binaryBody?: Uint8Array;
};

export type Message<Data = string> = {
  command: string;

  headers: StompHeaders;

  isBinaryBody: boolean;

  readonly body: Data;
};

export default class TanksWSClient {
  private client: Client;
  private subscriptionMap = new Map<
    string,
    { listeners: EndpointSubscription["onMessage"][]; unsubscribe: () => void }
  >();

  setAccessToken(accessToken: string | null) {
    if (accessToken === "" || accessToken === null) {
      delete this.client.connectHeaders["Authorization"];
      return;
    }

    this.client.connectHeaders = {
      ...this.client.connectHeaders,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  constructor(
    accessToken: string,
    private refreshHandler: () => Promise<RefreshResponseDto>,
  ) {
    this.client = new Client({
      brokerURL: import.meta.env.VITE_BASE_WEBSOCKETS_URL,
      debug: import.meta.env.DEV ? console.log : undefined,
      reconnectDelay: 5000, // 5 seconds
    });

    this.setAccessToken(accessToken);
  }

  setRefreshHandler(refreshHandler: () => Promise<RefreshResponseDto>) {
    this.refreshHandler = refreshHandler;
  }

  onStompError(onStompError: Client["onStompError"]) {
    this.client.onStompError = onStompError;
  }

  onConnect(onConnect: Client["onConnect"]) {
    this.client.onConnect = onConnect;
  }

  isActive() {
    return this.client.active;
  }

  deactivate() {
    if (this.isActive()) this.client.deactivate();
  }

  activate() {
    if (!this.isActive()) {
      if (this.client.onStompError === null) {
        this.client.onStompError = async (err) => {
          try {
            if (
              err.headers["content-type"] &&
              err.headers["content-type"] === "application/json"
            ) {
              const problemDetail = JSON.parse(err.body) as ProblemDetailDto;

              if (import.meta.env.DEV) console.log(err);

              if (problemDetail.status === 401) {
                await this.refreshHandler();
              }
            }
          } catch (err) {
            if (import.meta.env.DEV) console.log(err);
            this.client.deactivate();
          }
        }
      }
      this.client.activate();
    }
  }

  onWebSocketClose(onWebSocketClose: Client["onWebSocketClose"]) {
    this.client.onWebSocketClose = onWebSocketClose;
  }

  publish(params: PublishParams) {
    const finalParams: any = { ...params };

    if (finalParams.body && typeof finalParams.body !== "string") {
      finalParams.headers = {
        ...finalParams.headers,
        "content-type": "application/json",
      };
      finalParams.body = JSON.stringify(finalParams.body);
    }

    if (finalParams.destination.includes(":id")) {
      if (finalParams.id === undefined)
        throw new Error(
          "Id is not defined for path '" + finalParams.destination + "'",
        );
      finalParams.destination = finalParams.destination.replace(
        ":id",
        finalParams.id.toString(),
      );
    }

    this.client.publish(finalParams as IPublishParams);
  }

  subscribe<Data = WebSocketEventResponseDto>(
    params: EndpointSubscription<Data>,
  ): SubscriptionCleanup {
    if (!this.isActive()) throw new Error("Client is not active");

    const finalParams: any = { ...params };

    if (finalParams.destination.includes(":id")) {
      if (finalParams.id === undefined)
        throw new Error(
          "Id is not defined for path '" + finalParams.destination + "'",
        );

      finalParams.destination = finalParams.destination.replace(
        ":id",
        finalParams.id.toString(),
      );
    }

    const handleMessage = (message: IMessage) => {
      try {
        if (
          message.headers &&
          message.headers["content-type"] === "application/json"
        ) {
          const parsedMessage = {
            ...message,
            body: JSON.parse(message.body) as Data,
          };

          const { listeners } = this.subscriptionMap.get(
            finalParams.destination,
          )!;
          listeners.forEach((listener) => listener(parsedMessage as Message));
        }
      } catch (err) {
        throw new JSONError("Failed to parse json body");
      }
    };

    const currentSubscriptions = this.subscriptionMap.get(finalParams.destination);

    if (currentSubscriptions === undefined) {
      const recipt = this.client.subscribe(
        finalParams.destination,
        handleMessage,
        finalParams.subscriptionHeaders,
      );

      const subscriptions = {
        listeners: [finalParams.onMessage],
        unsubscribe: recipt.unsubscribe,
      };
      this.subscriptionMap.set(finalParams.destination, subscriptions);
    } else {
      currentSubscriptions.listeners.push(finalParams.onMessage);
    }

    return () => {
      const subscriptions = this.subscriptionMap.get(finalParams.destination);
      if (subscriptions.listeners.length === 1) {
        this.subscriptionMap.delete(finalParams.destination);
        subscriptions.unsubscribe();
      } else {
        this.subscriptionMap.set(finalParams.destination, {
          ...subscriptions,
          listeners: subscriptions.listeners.filter(
            (listener) => listener !== finalParams.onMessage,
          ),
        });
      }
    };
  }
}
