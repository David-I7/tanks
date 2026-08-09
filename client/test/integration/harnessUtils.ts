import type ProblemDetailDto from "../../src/api/http/dto/ProblemDetailDto";
import {
  createMockGame,
  createStompClient,
  type MockGameResponse,
  type PlayerClient,
} from "./mockGameHarness";

export interface DiagnosticContext {
  authData?: MockGameResponse;
  playerClients: PlayerClient[];
  lobbyId?: string;
  quickMatchLobbyId?: string;
  gameSessionId?: string;
  activeClient?: PlayerClient;
  inactiveClient?: PlayerClient;
  hostClient?: PlayerClient;
}

type SetupType = "auth" | "connect" | "lobby" | "game";

export interface TestSetupOptions {
  setupType: SetupType;
  playerCount: number;
}

export async function createIsolatedTestContext(
  options: TestSetupOptions,
): Promise<DiagnosticContext> {
  const ctx: DiagnosticContext = { playerClients: [] };
  const setupPromises: Promise<void>[] = [];

  ctx.authData = await createMockGame(options.playerCount);

  if (options.setupType !== "auth") {
    for (let i = 0; i < options.playerCount; i++) {
      const player = ctx.authData.players[i];
      const client = await createStompClient(
        player.accessToken,
        player.username,
        player.id,
      );
      ctx.playerClients.push(client);

      setupPromises.push(setupUserRepliesSubscription(client));
      setupPromises.push(setupUserErrorsSubscription(client));
    }
    await Promise.all(setupPromises);
  }

  setupPromises.length = 0;

  if (options.setupType === "lobby" || options.setupType === "game") {
    if (ctx.playerClients.length < 2) {
      throw new Error(
        "At least 2 players are required for lobby or game setup.",
      );
    }

    const hostClient = ctx.playerClients[0];
    ctx.hostClient = hostClient;

    ctx.hostClient.client.publish({
      destination: "/app/lobby/create/private",
      body: JSON.stringify({ tankId: "vanguard-cyber" }),
    });

    const lobbyReply = await waitForReply(hostClient, "LOBBY_CREATED");
    ctx.lobbyId = lobbyReply.payload?.id || lobbyReply.payload?.lobbyId;
    setupPromises.push(setupLobbyTopicSubscription(hostClient, ctx.lobbyId!));

    const opponentClient = ctx.playerClients[1];
    opponentClient.client.publish({
      destination: `/app/lobby/join/private/${ctx.lobbyId}`,
      body: JSON.stringify({ tankId: "vanguard-cyber" }),
    });
    await waitForReply(opponentClient, "LOBBY_JOINED");
    setupPromises.push(
      setupLobbyTopicSubscription(opponentClient, ctx.lobbyId!),
    );

    await Promise.all(setupPromises);
  }

  setupPromises.length = 0;

  if (options.setupType === "game") {
    ctx.hostClient!.client.publish({
      destination: "/app/game/create",
    });
    const gameReply = await waitForReply(ctx.hostClient!, "GAME_CREATED");
    await waitForReply(ctx.playerClients[1], "GAME_CREATED");
    ctx.gameSessionId = gameReply.payload?.id;
    setupPromises.push(
      setupGameTopicSubscription(ctx.hostClient!, ctx.gameSessionId!),
    );
    setupPromises.push(
      setupGameTopicSubscription(ctx.playerClients[1], ctx.gameSessionId!),
    );
    await Promise.all(setupPromises);
    await waitForReply(ctx.hostClient!, "INITIAL_STATE");
    await waitForReply(ctx.playerClients[1], "INITIAL_STATE");
    ctx.activeClient = ctx.hostClient;
    ctx.inactiveClient = ctx.playerClients[1];
  }

  setupPromises.length = 0;

  return ctx;
}

export async function teardownTestContext(
  ctx: DiagnosticContext,
): Promise<void> {
  if (!ctx) return;
  try {
    await Promise.all(
      ctx.playerClients.map((client) => teardownClient(client)),
    );
  } catch (ignored) {}

  if (ctx.gameSessionId !== undefined) {
    const baseUrl = "http://localhost:8080/api/v1";
    const MOCK_URL =
      baseUrl +
      "/test/mock-game/cleanup-game?gameSessionId=" +
      ctx.gameSessionId;
    await fetch(MOCK_URL, { method: "DELETE" });
  }

  ctx.playerClients = [];
  ctx.authData = undefined;
  ctx.lobbyId = undefined;
  ctx.quickMatchLobbyId = undefined;
  ctx.gameSessionId = undefined;
  ctx.activeClient = undefined;
  ctx.inactiveClient = undefined;
}

export async function teardownClient(
  playerClient: PlayerClient | undefined,
): Promise<void> {
  if (!playerClient) return;
  try {
    await playerClient.client.deactivate();
    playerClient.playerId = -1;
    playerClient.username = "";
    playerClient.receivedTopicMessages = [];
    playerClient.receivedReplies = [];
    playerClient.receivedErrors = [];
    playerClient.subscriptions.clear();
  } catch (ignored) {}
}

export function setupUserRepliesSubscription(
  playerClient: PlayerClient,
): Promise<void> {
  return subscribeWithReceipt(
    playerClient,
    "/user/queue/replies",
    (message) => {
      try {
        playerClient.receivedReplies.push(message);
      } catch (error) {
        throw new Error(
          `Failed to parse reply queue message for ${playerClient.username}: ${error}`,
        );
      }
    },
  );
}

export function setupUserErrorsSubscription(
  playerClient: PlayerClient,
): Promise<void> {
  return subscribeWithReceipt(playerClient, "/user/queue/errors", (message) => {
    try {
      playerClient.receivedErrors.push(message);
    } catch (error) {
      throw new Error(
        `Failed to parse error queue message for ${playerClient.username}: ${error}`,
      );
    }
  });
}

export function setupLobbyTopicSubscription(
  playerClient: PlayerClient,
  lobbyId: string,
): Promise<void> {
  const topic = `/topic/lobby/${lobbyId}`;

  return subscribeWithReceipt(playerClient, topic, (message) => {
    try {
      playerClient.receivedTopicMessages.push(message);
    } catch (error) {
      throw new Error(
        `Failed to parse lobby topic message for ${playerClient.username}: ${error}`,
      );
    }
  });
}

function createReceiptPromise(
  playerClient: PlayerClient,
  receiptId: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    playerClient.client.watchForReceipt(receiptId, (callback) => {
      if (callback.command === "RECEIPT") resolve();
      else
        reject(
          new Error(`Failed to receive receipt for ${playerClient.username}`),
        );
    });
  });
}

function createReceipt() {
  return crypto.randomUUID();
}

export function subscribeWithReceipt(
  playerClient: PlayerClient,
  destination: string,
  callback: (message: any) => void,
): Promise<void> {
  const receipt = createReceipt();
  const receiptPromise = createReceiptPromise(playerClient, receipt);
  const sub = playerClient.client.subscribe(
    destination,
    (message) => {
      try {
        callback(JSON.parse(message.body));
      } catch (error) {
        throw new Error(
          `Failed to parse message for ${playerClient.username}: ${error}`,
        );
      }
    },
    { receipt: receipt },
  );
  playerClient.subscriptions.set(destination, sub);
  return receiptPromise;
}

import { isOnlineDiffBatchResponseDto } from "../../src/api/ws/dto/gameplay/onlineGameplayProtocol";

export function setupGameTopicSubscription(
  playerClient: PlayerClient,
  gameSessionId: string,
): Promise<void> {
  const topic = `/topic/game/${gameSessionId}`;

  return subscribeWithReceipt(playerClient, topic, (message) => {
    try {
      playerClient.receivedTopicMessages.push(message);
      if (isOnlineDiffBatchResponseDto(message)) {
        for (const diff of message.diffs) {
          playerClient.receivedTopicMessages.push(diff);
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to parse game topic message for ${playerClient.username}: ${error}`,
      );
    }
  });
}

export function unsubscribeTopic(
  playerClient: PlayerClient,
  topic: string,
): void {
  const sub = playerClient.subscriptions.get(topic);
  if (sub) {
    try {
      sub.unsubscribe();
    } catch (ignored) {}
    playerClient.subscriptions.delete(topic);
  }
}

export function waitForReply(
  playerClient: PlayerClient,
  eventType: string,
  timeoutMs = 5000,
): Promise<any> {
  return waitForBroadcast(
    playerClient.receivedReplies,
    playerClient.username,
    eventType,
    timeoutMs,
  );
}
export function waitForStompError(
  playerClient: PlayerClient,
  timeoutMs = 5000,
): Promise<ProblemDetailDto> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkError = () => {
      if (playerClient.lifecycleEvents.stompError) {
        resolve(playerClient.lifecycleEvents.stompError);
      } else if (Date.now() - startTime > timeoutMs) {
        reject(
          new Error(
            `Timeout waiting for STOMP error for ${playerClient.username}`,
          ),
        );
      } else {
        setTimeout(checkError, 50);
      }
    };

    checkError();
  });
}
export function waitForErrorReply(
  playerClient: PlayerClient,
  timeoutMs = 5000,
): Promise<any> {
  return waitForBroadcast(
    playerClient.receivedErrors,
    playerClient.username,
    undefined,
    timeoutMs,
  );
}
export function waitForTopicMessage(
  playerClient: PlayerClient,
  eventType: string,
  timeoutMs = 5000,
): Promise<any> {
  return waitForBroadcast(
    playerClient.receivedTopicMessages,
    playerClient.username,
    eventType,
    timeoutMs,
  );
}
function waitForBroadcast(
  receivedMessages: any[],
  username: string,
  eventType?: string,
  timeoutMs = 5000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const existingPredicate =
      eventType !== undefined
        ? (messages: any[]) => messages.find((r) => r.type === eventType)
        : (messages: any[]) => (messages.length > 0 ? messages[0] : undefined);

    const existing = existingPredicate(receivedMessages);
    if (existing) {
      return resolve(existing);
    }

    const interval = setInterval(() => {
      const found = existingPredicate(receivedMessages);
      if (found) {
        clearInterval(interval);
        resolve(found);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(
          new Error(`Timeout waiting for reply '${eventType}' for ${username}`),
        );
      }
    }, 50);
  });
}

export function sendIntent(
  playerClient: PlayerClient,
  gameSessionId: string,
  intentPayload: any,
): void {
  const fullPayload = {
    gameSessionId,
    ...intentPayload,
  };

  playerClient.client.publish({
    destination: `/app/game/${gameSessionId}/intent`,
    body: JSON.stringify(fullPayload),
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
