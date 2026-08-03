import { startMockGame, createStompClient, type PlayerClient } from './mockGameHarness';

async function runDiagnostics() {
  console.log('=====================================================');
  console.log('🎮 STARTING CLIENT-SERVER INTENT DIAGNOSTIC HARNESS 🎮');
  console.log('=====================================================\n');

  try {
    // 1. Start mock game on server
    console.log('[1/4] Requesting mock game session from server...');
    const game = await startMockGame();
    console.log(`✓ Game Session Created: ${game.gameSessionId}`);
    console.log(`  Player A: ${game.playerAUsername} (ID: ${game.playerAId})`);
    console.log(`  Player B: ${game.playerBUsername} (ID: ${game.playerBId})`);
    console.log(`  Active Player ID: ${game.activePlayerId}\n`);

    // 2. Connect WebSocket clients for both players
    console.log('[2/4] Connecting WebSocket clients...');
    const clientA = await createStompClient(game.playerAToken, game.playerAUsername, game.playerAId);
    const clientB = await createStompClient(game.playerBToken, game.playerBUsername, game.playerBId);

    // 3. Subscribe to queue & topics
    console.log('\n[3/4] Subscribing players to topics...');
    setupSubscriptions(clientA, game.gameSessionId);
    setupSubscriptions(clientB, game.gameSessionId);

    // Wait a brief moment for subscriptions to settle
    await sleep(500);

    // Identify active and inactive player clients
    const activeClient = game.activePlayerId === game.playerAId ? clientA : clientB;
    const inactiveClient = game.activePlayerId === game.playerAId ? clientB : clientA;

    console.log(`\nActive Client: ${activeClient.username} (Player ${activeClient.playerId})`);
    console.log(`Inactive Client: ${inactiveClient.username} (Player ${inactiveClient.playerId})\n`);

    // 4. Run Test Scenarios
    console.log('[4/4] Executing Intent Test Suite...\n');

    // Test 1: Active player sends valid MOVE intent with turnStart sequence (2) -> expect accepted (MOVEMENT_SEGMENT)
    await runTestScenario('TEST 1: Active Player Valid MOVE Intent (Sequence 2)', async () => {
      sendIntent(activeClient, game.gameSessionId, {
        intentId: `test-move-${Date.now()}`,
        type: 'MOVE',
        playerId: activeClient.playerId,
        lastConfirmedDiffSequence: 2,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: 1 },
      });
    }, activeClient);

    // Test 2: Inactive player sends move intent -> expect rejection (NOT_ACTIVE_PLAYER)
    await runTestScenario('TEST 2: Inactive Player Intent', async () => {
      sendIntent(inactiveClient, game.gameSessionId, {
        intentId: `test-inactive-${Date.now()}`,
        type: 'MOVE',
        playerId: inactiveClient.playerId,
        lastConfirmedDiffSequence: 2,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: 1 },
      });
    }, inactiveClient);

    // Test 3: Active player sends AIM intent with out-of-bounds power -> expect INVALID_PAYLOAD
    await runTestScenario('TEST 3: Active Player Invalid Payload AIM Intent', async () => {
      sendIntent(activeClient, game.gameSessionId, {
        intentId: `test-aim-invalid-${Date.now()}`,
        type: 'AIM',
        playerId: activeClient.playerId,
        lastConfirmedDiffSequence: 3,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 999999 },
      });
    }, activeClient);

    // Test 4: Active player sends valid AIM intent -> expect accepted (AIM_UPDATE)
    await runTestScenario('TEST 4: Active Player Valid AIM Intent', async () => {
      sendIntent(activeClient, game.gameSessionId, {
        intentId: `test-aim-${Date.now()}`,
        type: 'AIM',
        playerId: activeClient.playerId,
        lastConfirmedDiffSequence: 3,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 300 },
      });
    }, activeClient);

    // Test 5: Active player sends valid FIRE intent -> expect accepted (PROJECTILE_RESOLUTION)
    await runTestScenario('TEST 5: Active Player Valid FIRE Intent', async () => {
      sendIntent(activeClient, game.gameSessionId, {
        intentId: `test-fire-${Date.now()}`,
        type: 'FIRE',
        playerId: activeClient.playerId,
        lastConfirmedDiffSequence: 3,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 300 },
      });
    }, activeClient);

    console.log('=====================================================');
    console.log('✅ DIAGNOSTIC HARNESS FINISHED');
    console.log('=====================================================\n');

    clientA.client.deactivate();
    clientB.client.deactivate();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ DIAGNOSTIC HARNESS FAILED:', err);
    process.exit(1);
  }
}

function setupSubscriptions(playerClient: PlayerClient, gameSessionId: string) {
  playerClient.client.subscribe('/user/queue/replies', (message) => {
    try {
      const parsed = JSON.parse(message.body);
      playerClient.receivedReplies.push(parsed);
      console.log(`  📩 [REPLY -> ${playerClient.username}]`, parsed.type || 'REPLY', JSON.stringify(parsed));
    } catch {
      console.log(`  📩 [REPLY -> ${playerClient.username}]`, message.body);
    }
  });

  playerClient.client.subscribe(`/topic/game/${gameSessionId}`, (message) => {
    try {
      const parsed = JSON.parse(message.body);
      playerClient.receivedDiffs.push(parsed);
      console.log(`  🌐 [GAME TOPIC -> ${playerClient.username}]`, parsed.type || 'DIFF', JSON.stringify(parsed));
    } catch {
      console.log(`  🌐 [GAME TOPIC -> ${playerClient.username}]`, message.body);
    }
  });
}

function sendIntent(playerClient: PlayerClient, gameSessionId: string, intentPayload: any) {
  const fullPayload = {
    protocolVersion: 'V1',
    gameSessionId,
    ...intentPayload,
  };
  console.log(`  📤 [SENDING INTENT (${playerClient.username})] type=${intentPayload.type} id=${intentPayload.intentId} seq=${intentPayload.lastConfirmedDiffSequence}`);
  playerClient.client.publish({
    destination: `/app/game/${gameSessionId}/intent`,
    body: JSON.stringify(fullPayload),
  });
}

async function runTestScenario(name: string, action: () => Promise<void>, targetClient: PlayerClient) {
  console.log(`-----------------------------------------------------`);
  console.log(`▶ ${name}`);
  const repliesBefore = targetClient.receivedReplies.length;
  const diffsBefore = targetClient.receivedDiffs.length;

  await action();
  await sleep(1000);

  const newReplies = targetClient.receivedReplies.slice(repliesBefore);
  const newDiffs = targetClient.receivedDiffs.slice(diffsBefore);

  console.log(`  Results: Received ${newReplies.length} replies, ${newDiffs.length} topic diffs`);
  console.log(`-----------------------------------------------------\n`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

runDiagnostics();
