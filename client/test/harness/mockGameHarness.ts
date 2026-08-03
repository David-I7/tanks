import { Client } from '@stomp/stompjs';

export interface MockGameResponse {
  gameSessionId: string;
  playerAToken: string;
  playerBToken: string;
  playerAUsername: string;
  playerBUsername: string;
  playerAId: number;
  playerBId: number;
  activePlayerId: number;
}

export interface PlayerClient {
  client: Client;
  username: string;
  playerId: number;
  receivedDiffs: any[];
  receivedReplies: any[];
}

const SERVER_HTTP_URL = process.env.SERVER_HTTP_URL || 'http://localhost:8080';
const SERVER_WS_URL = process.env.SERVER_WS_URL || 'ws://localhost:8080/ws';

export async function startMockGame(): Promise<MockGameResponse> {
  const res = await fetch(`${SERVER_HTTP_URL}/api/v1/test/mock-game/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to start mock game: ${res.status} ${res.statusText} - ${text}`);
  }
  return (await res.json()) as MockGameResponse;
}

export function createStompClient(token: string, username: string, playerId: number): Promise<PlayerClient> {
  return new Promise((resolve, reject) => {
    const playerClient: PlayerClient = {
      client: null!,
      username,
      playerId,
      receivedDiffs: [],
      receivedReplies: [],
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
        console.log(`[STOMP] Connected as ${username} (Player ${playerId})`);
        resolve(playerClient);
      },
      onStompError: (frame) => {
        console.error(`[STOMP ERROR ${username}]`, frame.headers['message'], frame.body);
        reject(new Error(frame.headers['message'] || 'STOMP error'));
      },
      onWebSocketError: (event) => {
        console.error(`[WS ERROR ${username}]`, event);
        reject(event);
      },
    });

    if (typeof window === 'undefined' && typeof globalThis.WebSocket !== 'undefined') {
      client.webSocketFactory = () => new globalThis.WebSocket(SERVER_WS_URL);
    }

    playerClient.client = client;
    client.activate();
  });
}
