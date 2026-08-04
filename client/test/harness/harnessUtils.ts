import {
  startMockGame,
  createStompClient,
  type MockGameResponse,
  type PlayerClient,
} from "./mockGameHarness";

export interface DiagnosticContext {
  authData?: MockGameResponse;
  clientA?: PlayerClient;
  clientB?: PlayerClient;
  lobbyId?: string;
  quickMatchLobbyId?: string;
  gameSessionId?: string;
  activeClient?: PlayerClient;
  inactiveClient?: PlayerClient;
}

export interface TestSetupOptions {
  auth?: boolean;
  connect?: boolean;
  lobby?: boolean;
  game?: boolean;
}

export async function createIsolatedTestContext(
  options: TestSetupOptions = {},
): Promise<DiagnosticContext> {
  const ctx: DiagnosticContext = {};

  if (options.auth || options.connect || options.lobby || options.game) {
    ctx.authData = await startMockGame();
  }

  if (options.connect || options.lobby || options.game) {
    ctx.clientA = await createStompClient(
      ctx.authData!.playerAToken,
      ctx.authData!.playerAUsername,
      ctx.authData!.playerAId,
    );
    ctx.clientB = await createStompClient(
      ctx.authData!.playerBToken,
      ctx.authData!.playerBUsername,
      ctx.authData!.playerBId,
    );
    setupUserQueueSubscription(ctx.clientA);
    setupUserQueueSubscription(ctx.clientB);
    await sleep(200);
  }

  if (options.lobby || options.game) {
    ctx.clientA!.client.publish({
      destination: "/app/lobby/create/private",
      body: JSON.stringify({ tankId: "vanguard-cyber" }),
    });
    const lobbyReply = await waitForReply(ctx.clientA!, "LOBBY_CREATED");
    ctx.lobbyId = lobbyReply.payload?.id || lobbyReply.payload?.lobbyId;
    setupLobbyTopicSubscription(ctx.clientA!, ctx.lobbyId!);

    ctx.clientB!.client.publish({
      destination: `/app/lobby/join/private/${ctx.lobbyId}`,
      body: JSON.stringify({ tankId: "vanguard-cyber" }),
    });
    await waitForReply(ctx.clientB!, "LOBBY_JOINED");
    setupLobbyTopicSubscription(ctx.clientB!, ctx.lobbyId!);
    await sleep(200);
  }

  if (options.game) {
    ctx.clientA!.client.publish({
      destination: "/app/game/create",
      body: JSON.stringify({}),
    });
    const gameReply = await waitForReply(ctx.clientA!, "GAME_CREATED");
    ctx.gameSessionId =
      gameReply.payload?.id || gameReply.payload?.gameSessionId;
    setupGameTopicSubscription(ctx.clientA!, ctx.gameSessionId!);
    setupGameTopicSubscription(ctx.clientB!, ctx.gameSessionId!);
    ctx.activeClient = ctx.clientA;
    ctx.inactiveClient = ctx.clientB;
    await sleep(300);
  }

  return ctx;
}

export function teardownTestContext(ctx: DiagnosticContext): void {
  try {
    ctx.clientA?.client.deactivate();
  } catch (ignored) {}
  try {
    ctx.clientB?.client.deactivate();
  } catch (ignored) {}
}

export function setupUserQueueSubscription(playerClient: PlayerClient): void {
  playerClient.client.subscribe("/user/queue/replies", (message) => {
    try {
      const parsed = JSON.parse(message.body);
      playerClient.receivedReplies.push(parsed);
      console.log(
        `  📩 [REPLY -> ${playerClient.username}]`,
        parsed.type || "REPLY",
        JSON.stringify(parsed),
      );
    } catch {
      console.log(`  📩 [REPLY -> ${playerClient.username}]`, message.body);
    }
  });
}

export function setupLobbyTopicSubscription(
  playerClient: PlayerClient,
  lobbyId: string,
): void {
  const topic = `/topic/lobby/${lobbyId}`;
  const sub = playerClient.client.subscribe(topic, (message) => {
    console.log(`  🏠 [LOBBY TOPIC -> ${playerClient.username}]`, message.body);
  });
  playerClient.subscriptions.set(topic, sub);
}

export function setupGameTopicSubscription(
  playerClient: PlayerClient,
  gameSessionId: string,
): void {
  const topic = `/topic/game/${gameSessionId}`;
  const sub = playerClient.client.subscribe(topic, (message) => {
    try {
      const parsed = JSON.parse(message.body);
      playerClient.receivedDiffs.push(parsed);
      console.log(
        `  🌐 [GAME TOPIC -> ${playerClient.username}]`,
        parsed.type || "DIFF",
        JSON.stringify(parsed),
      );
    } catch {
      console.log(
        `  🌐 [GAME TOPIC -> ${playerClient.username}]`,
        message.body,
      );
    }
  });
  playerClient.subscriptions.set(topic, sub);
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
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const existing = playerClient.receivedReplies.find(
      (r) => r.type === eventType,
    );
    if (existing) {
      return resolve(existing);
    }

    const interval = setInterval(() => {
      const found = playerClient.receivedReplies.find(
        (r) => r.type === eventType,
      );
      if (found) {
        clearInterval(interval);
        resolve(found);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(
          new Error(
            `Timeout waiting for reply '${eventType}' for ${playerClient.username}`,
          ),
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
    protocolVersion: "V1",
    gameSessionId,
    ...intentPayload,
  };
  console.log(
    `  📤 [SENDING INTENT (${playerClient.username})] type=${intentPayload.type} id=${intentPayload.intentId} seq=${intentPayload.lastConfirmedDiffSequence}`,
  );
  playerClient.client.publish({
    destination: `/app/game/${gameSessionId}/intent`,
    body: JSON.stringify(fullPayload),
  });
}

export async function runTestScenario(
  name: string,
  action: () => Promise<void>,
  targetClient: PlayerClient,
): Promise<void> {
  console.log(`-----------------------------------------------------`);
  console.log(`▶ ${name}`);
  const repliesBefore = targetClient.receivedReplies.length;
  const diffsBefore = targetClient.receivedDiffs.length;

  await action();
  await sleep(1000);

  const newReplies = targetClient.receivedReplies.slice(repliesBefore);
  const newDiffs = targetClient.receivedDiffs.slice(diffsBefore);

  console.log(
    `  Results: Received ${newReplies.length} replies, ${newDiffs.length} topic diffs`,
  );
  console.log(`-----------------------------------------------------\n`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
