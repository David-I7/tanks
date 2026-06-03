import {
  Client,
  StompHeaders,
  type IMessage,
  type IPublishParams,
  type StompSubscription,
} from "@stomp/stompjs";
import type RefreshResponseDto from "../http/dto/RefreshResponseDto";
import type ProblemDetailDto from "../http/dto/ProblemDetailDto";
import { JSONError } from "../../errors/JSONError";

type EndpointSubscription<Data = string> = {
  destination:
    | "/topic/lobby/:id/game"
    | "/topic/lobby/:id/chat"
    | "/user/queue/errors"
    | "/user/queue/replies";
  id?: string | number;
  onMessage: (message: Message<Data>) => void;
  subscriptionHeaders?: StompHeaders;
};

type PublishParams = {
  destination:
    | "/app/chat/:id/send"
    | "/app/game/:id/send"
    | "/app/lobby/create"
    | "/app/lobby/quick-match"
    | "/app/lobby/join/:id";

  id?: string | number;

  headers?: StompHeaders;

  body?: string | Record<string, any>;

  binaryBody?: Uint8Array;
};

type Message<Data = string> = {
  command: string;

  headers: StompHeaders;

  isBinaryBody: boolean;

  readonly body: Data;
};

export default class TanksWSClient {
  private static client: Client;
  private static refreshHandler?: () => Promise<RefreshResponseDto>;

  static {
    this.client = new Client({
      brokerURL: import.meta.env.VITE_BASE_WEBSOCKETS_URL,
      debug: import.meta.env.DEV ? console.log : undefined,
      reconnectDelay: 5000, // 5 seconds
      onStompError: async (err) => {
        if (import.meta.env.DEV) console.log(err);
        try {
          if (
            err.headers["content-type"] &&
            err.headers["content-type"] === "application/json"
          ) {
            const problemDetail = JSON.parse(err.body) as ProblemDetailDto;

            if (problemDetail.status === 401) {
              await this.refreshHandler?.();
            }
          }
        } catch (err) {
          this.client.deactivate();
        }
      },
    });
  }

  static setRefreshHandler(refreshHandler: () => Promise<RefreshResponseDto>) {
    this.refreshHandler = refreshHandler;
  }

  static setAccessToken(accessToken: string) {
    if (accessToken === "") {
      delete this.client.connectHeaders["Authorization"];
      return;
    }

    this.client.connectHeaders = {
      ...this.client.connectHeaders,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  constructor() {
    if (!TanksWSClient.client.active) TanksWSClient.client.activate();
  }

  setOnConnect(onConnect: Client["onConnect"]) {
    TanksWSClient.client.onConnect = onConnect;
  }

  isActive() {
    return TanksWSClient.client.active;
  }

  deactivate() {
    if (this.isActive()) TanksWSClient.client.deactivate();
  }

  activate() {
    if (!this.isActive()) TanksWSClient.client.activate();
  }

  onDisconnect(onDisconnect: Client["onDisconnect"]) {
    return (TanksWSClient.client.onDisconnect = onDisconnect);
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

    TanksWSClient.client.publish(finalParams as IPublishParams);
  }

  subscribe<Data = string>(
    params: EndpointSubscription<Data>,
  ): StompSubscription {
    if (!this.isActive()) throw new Error("Client is not active");

    const finalParams: any = { ...params };

    function handleMessage(message: IMessage) {
      try {
        if (
          message.headers &&
          message.headers["content-type"] === "application/json"
        ) {
          finalParams.onMessage({
            ...message,
            body: JSON.parse(message.body) as Data,
          });
        }
      } catch (err) {
        throw new JSONError("Failed to parse json body");
      }
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

    return TanksWSClient.client.subscribe(
      finalParams.destination,
      handleMessage,
      finalParams.subscriptionHeaders,
    );
  }
}
