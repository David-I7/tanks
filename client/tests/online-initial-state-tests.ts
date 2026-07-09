import assert from "node:assert/strict";

import {
  initializeOnlineConfirmedState,
  type OnlineConfirmedState,
} from "../src/game/online/onlineConfirmedState";
import type {
  OnlineDiffEnvelope,
  OnlineInitialStateDiff,
} from "../src/api/ws/dto/gameplay/onlineGameplayProtocol";

const initialStateDiff = {
  protocolVersion: "online-gameplay.v1",
  gameSessionId: "game-123",
  sequence: 1,
  serverTick: 0,
  type: "INITIAL_STATE",
  intentId: null,
  payload: {
    expectedNextDiffSequence: 2,
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
      tanks: [
        {
          entityId: 10,
          playerId: 1,
          displayName: "Player 1",
          tankDefinitionId: "vanguard",
          renderAssetId: "tank.vanguard",
          position: { x: 50, y: 120 },
          facing: 1,
          aimAngle: 45,
          power: 0.5,
          selectedProjectileSlotId: "standard",
          loadout: [
            {
              id: "standard",
              projectileDefinitionId: "basicShell",
              label: "Std",
              renderAssetId: "projectile-slot.standard",
            },
          ],
          health: 110,
          maxHealth: 110,
          fuel: 100,
          alive: true,
        },
      ],
      projectiles: [],
    },
  },
} satisfies OnlineDiffEnvelope<OnlineInitialStateDiff>;

const confirmed: OnlineConfirmedState = initializeOnlineConfirmedState(initialStateDiff);

assert.equal(confirmed.gameSessionId, "game-123");
assert.equal(confirmed.lastConfirmedDiffSequence, 1);
assert.equal(confirmed.lastConfirmedDiffServerTick, 0);
assert.equal(confirmed.expectedNextDiffSequence, 2);
assert.equal(confirmed.pendingPredictions.length, 0);
assert.equal(confirmed.state.gameplayDefinitionVersion, "online-gameplay-definitions.v1");
assert.equal(confirmed.state.match.activePlayerId, 1);
assert.equal(confirmed.state.tanks[0]?.loadout[0]?.projectileDefinitionId, "basicShell");
