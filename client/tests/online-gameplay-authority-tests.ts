import assert from "node:assert/strict";

import type { OnlineDiffEnvelope } from "../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createOnlineGameplayAuthority,
} from "../src/game/online/OnlineGameplayAuthority";
import type {
  OnlineGameplayTransport,
} from "../src/game/online/OnlineGameplayTransport";

function initialDiff(sequence = 1): OnlineDiffEnvelope {
  return {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence,
    serverTick: 0,
    type: "INITIAL_STATE",
    intentId: null,
    payload: {
      expectedNextDiffSequence: sequence + 1,
      localPlayerId: 1,
      state: {
        gameplayDefinitionVersion: "online-gameplay-definitions.v1",
        match: {
          phase: "AIMING",
          activePlayerId: 1,
          playerCount: 2,
          turnNumber: 1,
          turnTimeRemainingTicks: 900,
          winnerPlayerId: null,
        },
        terrain: {
          kind: "HEIGHTMAP",
          width: 4,
          height: 3,
          surface: [2, 2, 1, 2],
        },
        tanks: [],
        projectiles: [],
      },
    },
  };
}

function movementDiff(sequence = 2): OnlineDiffEnvelope {
  return {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence,
    serverTick: 30,
    type: "MOVEMENT_SEGMENT",
    intentId: "intent-move",
    payload: {
      intentId: "intent-move",
      playerId: 1,
      tankEntityId: 10,
      from: { x: 50, y: 120 },
      to: { x: 55, y: 120 },
      fuelBefore: 100,
      fuelAfter: 95,
      fuelSpent: 5,
      startedServerTick: 30,
      endedServerTick: 45,
      durationTicks: 15,
    },
  };
}

function createTransport(): {
  emit(diff: OnlineDiffEnvelope): void;
  resyncRequests: number;
  transport: OnlineGameplayTransport;
} {
  let listener: ((diff: OnlineDiffEnvelope) => void) | null = null;
  let resyncRequests = 0;

  return {
    emit(diff: OnlineDiffEnvelope): void {
      listener?.(diff);
    },
    get resyncRequests(): number {
      return resyncRequests;
    },
    transport: {
      sendPlayerIntent(): void {},
      requestResyncState(): void {
        resyncRequests += 1;
      },
      subscribeToStateDiffs(nextListener): () => void {
        listener = nextListener;
        return () => {
          listener = null;
        };
      },
      subscribeToGameEvents(): () => void {
        return () => {};
      },
      destroy(): void {
        listener = null;
      },
    },
  };
}

{
  const test = createTransport();
  const authority = createOnlineGameplayAuthority({ transport: test.transport });
  const seen: number[] = [];

  authority.subscribe((state) => {
    seen.push(state.lastConfirmedDiffSequence);
  });

  test.emit(initialDiff());
  test.emit(movementDiff(4));

  assert.deepEqual(seen, [1, 1]);
  assert.equal(test.resyncRequests, 1);
  assert.equal(authority.getConfirmedState()?.resyncStatus.kind, "REQUESTED");
  authority.destroy();
}
