import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { resolve } from "node:path";

import type {
  OnlineDiffEnvelope,
  OnlineGameStateSnapshot,
} from "../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  applyOnlineStateDiff,
  initializeOnlineConfirmedState,
} from "../src/game/online/onlineConfirmedState";

interface ScenarioStep {
  description: string;
  action: {
    type: string;
    playerId?: number;
    intentId?: string;
    payload?: any;
    replacesSequence?: number;
    reason?: string;
  };
  expectedDiffs: any[];
  expectedState: {
    activePlayerId?: number;
    playerATankX?: number;
    playerATankFuel?: number;
    playerBTankHealth?: number;
    playerTurn?: string;
    turnNumber?: number;
    serverTick?: number;
    nextDiffSequence?: number;
  };
}

interface Scenario {
  name: string;
  playerA: string;
  playerB: string;
  initialState: OnlineGameStateSnapshot;
  steps: ScenarioStep[];
}

const scenarios: Scenario[] = JSON.parse(
  readFileSync(resolve(process.cwd(), "../docs/contracts/tanks-golden-simulation-scenarios.json"), "utf8"),
);

for (const scenario of scenarios) {
  console.log(`Running Golden Client Simulation: ${scenario.name}`);

  // Create an initial INITIAL_STATE diff envelope to initialize state
  const initialDiff: any = {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    sequence: 1,
    serverTick: 0,
    type: "INITIAL_STATE",
    intentId: null,
    payload: {
      expectedNextDiffSequence: 2,
      localPlayerId: 1,
      state: scenario.initialState,
    },
  };

  let confirmed = initializeOnlineConfirmedState(initialDiff);

  for (const step of scenario.steps) {
    console.log(`  - Step: ${step.description}`);

    for (const diff of step.expectedDiffs) {
      confirmed = applyOnlineStateDiff(confirmed, diff, () => 1000);
    }

    // Verify expectedState properties on the confirmed state
    const expected = step.expectedState;
    if (expected.activePlayerId !== undefined) {
      assert.equal(confirmed.state.match.activePlayerId, expected.activePlayerId);
    }
    if (expected.playerATankX !== undefined) {
      assert.equal(confirmed.state.tanks[0]?.position.x, expected.playerATankX);
    }
    if (expected.playerATankFuel !== undefined) {
      assert.equal(confirmed.state.tanks[0]?.fuel, expected.playerATankFuel);
    }
    if (expected.playerBTankHealth !== undefined) {
      assert.equal(confirmed.state.tanks[1]?.health, expected.playerBTankHealth);
    }
    if (expected.turnNumber !== undefined) {
      assert.equal(confirmed.state.match.turnNumber, expected.turnNumber);
    }
    if (expected.nextDiffSequence !== undefined) {
      assert.equal(confirmed.expectedNextDiffSequence, expected.nextDiffSequence);
    }
  }
}
console.log("All Golden Client Simulations passed!");
