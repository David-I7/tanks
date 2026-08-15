import { Client } from "@stomp/stompjs";
import type ProblemDetailDto from "../../src/api/http/dto/ProblemDetailDto";

export interface MockPlayer {
  username: string;
  id: number;
  accessToken: string;
}

export interface MockGameResponse {
  players: MockPlayer[];
}

export interface PlayerClient {
  client: Client;
  username: string;
  playerId: number;
  receivedTopicMessages: any[];
  receivedReplies: any[];
  receivedErrors: any[];
  lifecycleEvents: {
    stompError: ProblemDetailDto | null;
    webSocketError: Event | null;
    webSocketClose: CloseEvent | null;
  };
  subscriptions: Map<string, any>;
}

const SERVER_HTTP_URL = "http://localhost:8080";
const SERVER_WS_URL = "ws://localhost:8080/ws";

export async function createMockGame(
  playerCount = 2,
): Promise<MockGameResponse> {
  const res = await fetch(
    `${SERVER_HTTP_URL}/api/v1/test/mock-game/create?playerCount=${playerCount}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to setup test authentication: ${res.status} ${res.statusText} - ${text}`,
    );
  }
  return (await res.json()) as MockGameResponse;
}

export function createStompClient(
  token: string,
  username: string,
  playerId: number,
): Promise<PlayerClient> {
  return new Promise((resolve, reject) => {
    const playerClient: PlayerClient = {
      client: null!,
      username,
      playerId,
      receivedTopicMessages: [],
      receivedReplies: [],
      receivedErrors: [],
      subscriptions: new Map(),
      lifecycleEvents: {
        stompError: null,
        webSocketError: null,
        webSocketClose: null,
      },
    };

    const client = new Client({
      brokerURL: SERVER_WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (_str) => {
        // debug logging if needed
      },
      onConnect: () => {
        resolve(playerClient);
      },
      onStompError: (frame) => {
        let bodyStr: string = frame.body;
        if (frame.isBinaryBody) {
          const rawBinary = (frame as any)._binaryBody || frame.binaryBody;
          if (rawBinary) {
            const decoder = new TextDecoder("utf-8");
            bodyStr = decoder.decode(rawBinary);
          }
        }
        const problemDetail = safeParseJsonMessage(bodyStr) || frame.headers;

        playerClient.lifecycleEvents.stompError = problemDetail;

        reject(problemDetail);
      },
      onWebSocketError: (event) => {
        playerClient.lifecycleEvents.webSocketError = event;

        reject(event);
      },
      onWebSocketClose: (event) => {
        playerClient.lifecycleEvents.webSocketClose = event;

        reject(event);
      },
    });

    playerClient.client = client;
    client.activate();
  });
}

function safeParseJsonMessage(message: any): any {
  if (typeof message === "string") {
    try {
      return JSON.parse(message);
    } catch {
      return message;
    }
  }
  if (message && typeof message === "object") {
    if (message.body) {
      try {
        return JSON.parse(message.body);
      } catch {
        return message.body;
      }
    }
  }
  return message;
}
