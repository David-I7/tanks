import { Client } from "@stomp/stompjs";

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
  subscriptions: Map<string, any>;
}

const SERVER_HTTP_URL = process.env.VITE_SERVER_ORIGIN;
const SERVER_WS_URL = process.env.VITE_BASE_WEBSOCKETS_URL;

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
  debug = false,
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
    };

    let resolved = false;

    const client = new Client({
      brokerURL: SERVER_WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (_str) => {
        // debug logging if needed
      },
      onConnect: () => {
        resolved = true;
        resolve(playerClient);
      },
      onStompError: (frame) => {
        if (debug) {
          console.error(
            `STOMP error for ${username}: ${safeParseJsonMessage(frame.body)}`,
          );
        }
        if (resolved) return;
        resolved = true;
        reject(new Error(frame.headers["message"] || "STOMP error"));
      },
      onWebSocketError: (event) => {
        if (debug) {
          console.error(`WebSocket error for ${username}`);
        }
        if (resolved) return;
        resolved = true;
        reject(event);
      },
      onWebSocketClose: (event) => {
        if (debug) {
          console.log(`WebSocket closed for ${username}`);
        }
        if (resolved) return;
        resolved = true;
        reject(event);
      },
    });

    playerClient.client = client;
    client.activate();
  });
}

function safeParseJsonMessage(message: any): any {
  try {
    return JSON.parse(message.body);
  } catch (error) {
    return null;
  }
}
