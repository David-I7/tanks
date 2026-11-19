import {
  Client,
  StompHeaders,
  type IMessage,
  type IPublishParams,
} from "@stomp/stompjs";
import type ProblemDetailDto from "../dto/ProblemDetailDto";
import { JSONError } from "../../errors/JSONError";
import type { WebSocketEventResponseDto } from "./dto/WebSocketEventResponseDto";
import WebSocketError from "../../errors/WebSocketError";

export type SubscriptionCleanup = () => void;

export type EndpointSubscription<Data = string> =
  | {
      destination: "/user/queue/errors" | "/user/queue/replies";
      onMessage: (message: Message<Data>) => void;
      subscriptionHeaders?: StompHeaders;
    }
  | {
      destination: "/topic/lobby/:id" | "/topic/game/:id";
      id: string | number;
      onMessage: (message: Message<Data>) => void;
      subscriptionHeaders?: StompHeaders;
    };

export type PublishParams =
  | {
      destination:
        | "/app/chat/:id/send"
        | "/app/game/:id/intent"
        | "/app/game/:id/send"
        | "/app/game/:id/resync"
        | "/app/game/:id/forfeit";

      id: string | number;

      headers?: StompHeaders;

      body?: string | Record<string, unknown>;

      binaryBody?: Uint8Array;
    }
  | {
      destination: "/app/game/create";

      headers?: StompHeaders;

      body?: string | Record<string, unknown>;

      binaryBody?: Uint8Array;
    };

export type Message<Data = string> = {
  command: string;

  headers: StompHeaders;

  isBinaryBody: boolean;

  readonly body: Data;
};

type WebSocketClientConfig = {
  onStompError?: (err: ProblemDetailDto) => void;
  onWebSocketClose?: Client["onWebSocketClose"];
  onConnect?: Client["onConnect"];
  onDisconnect?: Client["onDisconnect"];
  onWebSocketError?: Client["onWebSocketError"];
  onHeartbeatLost?: Client["onHeartbeatLost"];
  brokerURL: string;
  reconnectDelay?: number;
  debug?: boolean;
};

export default class WebSocketClient {
  private client: Client;
  private subscriptionMap = new Map<
    string,
    {
      listeners: EndpointSubscription<unknown>["onMessage"][];
      unsubscribe: () => void;
    }
  >();

  constructor(config: WebSocketClientConfig) {
    this.client = new Client({
      brokerURL: config.brokerURL,
      debug: config.debug ? console.log : undefined,
      reconnectDelay: config.reconnectDelay ?? 5000,
    });

    if (config.onConnect) {
      this.client.onConnect = config.onConnect;
    }
    if (config.onDisconnect) {
      this.client.onDisconnect = config.onDisconnect;
    }
    if (config.onWebSocketError) {
      this.client.onWebSocketError = config.onWebSocketError;
    }
    if (config.onHeartbeatLost) {
      this.client.onHeartbeatLost = config.onHeartbeatLost;
    }
    if (config.onStompError) {
      this.client.onStompError = this._onStompError(config.onStompError);
    }

    if (config.onWebSocketClose) {
      this.client.onWebSocketClose = (e) => {
        config.onWebSocketClose?.(e);
        this.subscriptionMap.clear();
      };
    }
  }

  private _onStompError(
    onStompError?: (err: ProblemDetailDto) => void,
  ): Client["onStompError"] {
    return (err) => {
      try {
        const contentType = err.headers
          ? err.headers["content-type"]
          : undefined;

        if (contentType && contentType.includes("json")) {
          let bodyStr: string = err.body;
          if (err.isBinaryBody) {
            const rawBinary =
              (
                err as unknown as {
                  _binaryBody?: Uint8Array;
                  binaryBody?: Uint8Array;
                }
              )._binaryBody || err.binaryBody;
            if (rawBinary) {
              const decoder = new TextDecoder("utf-8");
              bodyStr = decoder.decode(rawBinary);
            }
          }
          const problemDetail = JSON.parse(bodyStr) as ProblemDetailDto;
          onStompError?.(problemDetail);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.log(err);
      }
    };
  }

  isActive() {
    return this.client.active;
  }

  deactivate() {
    if (this.client.active) this.client.deactivate();
  }

  activate() {
    if (!this.client.active) {
      this.client.activate();
    }
  }

  publish(params: PublishParams) {
    let destination: string = params.destination;

    if (destination.includes(":id")) {
      if (!("id" in params) || params.id === undefined) {
        throw new WebSocketError(
          "Id is missing for path '" + destination + "'",
        );
      }
      destination = destination.replace(":id", params.id.toString());
    }

    const headers: StompHeaders = { ...params.headers };
    let body = params.body;

    if (body !== undefined && typeof body !== "string") {
      headers["content-type"] = "application/json";
      body = JSON.stringify(body);
    }

    const publishParams: IPublishParams = {
      destination,
      headers,
      body: body as string | undefined,
      binaryBody: params.binaryBody,
    };

    this.client.publish(publishParams);
  }

  subscribe<Data = WebSocketEventResponseDto>(
    params: EndpointSubscription<Data>,
  ): SubscriptionCleanup {
    if (!this.isActive()) throw new WebSocketError("Client is not active");

    let destination: string = params.destination;

    if (destination.includes(":id")) {
      if (!("id" in params) || params.id === undefined) {
        throw new WebSocketError(
          "Id is not defined for path '" + destination + "'",
        );
      }

      destination = destination.replace(":id", params.id.toString());
    }

    const handleMessage = (message: IMessage) => {
      try {
        const contentType = message.headers
          ? message.headers["content-type"]
          : undefined;
        if (!contentType || contentType.includes("json")) {
          const parsedMessage = {
            ...message,
            body:
              typeof message.body === "string"
                ? (JSON.parse(message.body) as Data)
                : (message.body as Data),
          };

          const subscriptions = this.subscriptionMap.get(destination)!;
          subscriptions?.listeners.forEach((listener) =>
            listener(parsedMessage as unknown as Message<unknown>),
          );
        }
      } catch {
        throw new JSONError("Failed to parse json body");
      }
    };

    const currentSubscriptions = this.subscriptionMap.get(destination);

    if (currentSubscriptions === undefined) {
      const receipt = this.client.subscribe(
        destination,
        handleMessage,
        params.subscriptionHeaders,
      );

      const subscriptions = {
        listeners: [
          params.onMessage as EndpointSubscription<unknown>["onMessage"],
        ],
        unsubscribe: receipt.unsubscribe,
      };
      this.subscriptionMap.set(destination, subscriptions);
    } else {
      currentSubscriptions.listeners.push(
        params.onMessage as EndpointSubscription<unknown>["onMessage"],
      );
    }

    return () => {
      const subscriptions = this.subscriptionMap.get(destination);
      if (!subscriptions) return;

      if (subscriptions.listeners.length === 1) {
        this.subscriptionMap.delete(destination);
        subscriptions.unsubscribe();
      } else {
        this.subscriptionMap.set(destination, {
          ...subscriptions,
          listeners: subscriptions.listeners.filter(
            (listener) => listener !== (params.onMessage as unknown),
          ),
        });
      }
    };
  }
}

export class WebSocketClientBuilder {
  private _brokerURL: string = import.meta.env.VITE_BASE_WEBSOCKETS_URL;
  private _reconnectDelay: number = 5000;
  private _debug: boolean = import.meta.env.DEV;
  private _onStompError?: (err: ProblemDetailDto) => void;
  private _onWebSocketClose?: Client["onWebSocketClose"];
  private _onConnect?: Client["onConnect"];
  private _onDisconnect?: Client["onDisconnect"];
  private _onWebSocketError?: Client["onWebSocketError"];
  private _onHeartbeatLost?: Client["onHeartbeatLost"];

  brokerURL(brokerURL: string): WebSocketClientBuilder {
    this._brokerURL = brokerURL;
    return this;
  }
  reconnectDelay(reconnectDelay: number): WebSocketClientBuilder {
    this._reconnectDelay = reconnectDelay;
    return this;
  }

  debug(debug: boolean): WebSocketClientBuilder {
    this._debug = debug;
    return this;
  }

  onStompError(
    handler: (err: ProblemDetailDto) => void,
  ): WebSocketClientBuilder {
    this._onStompError = handler;
    return this;
  }

  onWebSocketClose(
    handler: Client["onWebSocketClose"],
  ): WebSocketClientBuilder {
    this._onWebSocketClose = handler;
    return this;
  }

  onConnect(handler: Client["onConnect"]): WebSocketClientBuilder {
    this._onConnect = handler;
    return this;
  }

  onDisconnect(handler: Client["onDisconnect"]): WebSocketClientBuilder {
    this._onDisconnect = handler;
    return this;
  }

  onWebSocketError(
    handler: Client["onWebSocketError"],
  ): WebSocketClientBuilder {
    this._onWebSocketError = handler;
    return this;
  }

  onHeartbeatLost(handler: Client["onHeartbeatLost"]): WebSocketClientBuilder {
    this._onHeartbeatLost = handler;
    return this;
  }

  build(): WebSocketClient {
    const client = new WebSocketClient({
      brokerURL: this._brokerURL,
      reconnectDelay: this._reconnectDelay,
      debug: this._debug,
      onStompError: this._onStompError,
      onWebSocketClose: this._onWebSocketClose,
      onConnect: this._onConnect,
      onDisconnect: this._onDisconnect,
      onWebSocketError: this._onWebSocketError,
      onHeartbeatLost: this._onHeartbeatLost,
    });
    return client;
  }
}
