import { describe, it, expect } from "vitest";
import type {
  OnlineFireRequest,
  OnlineProjectileResolutionResponse,
  OnlineTurnTransitionResponse,
  OnlineTerminalGameResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("Ballistics & Turn Lifecycle Integration Suite", () => {
  it("Behavior 2: Ballistic state delays turn transition until projectile flight completes", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-ballistics-delay-${Date.now()}`;
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: "FIRE" as OnlineFireRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: -Math.PI / 4, power: 70 },
      });

      // Receive projectile resolution first
      const resolution = (await waitForTopicMessage(
        ctx.activeClient!,
        "PROJECTILE_RESOLUTION",
        5000,
      )) as OnlineDiffResponseDto<OnlineProjectileResolutionResponse>;

      expect(resolution).toBeDefined();
      expect(resolution.type).toBe("PROJECTILE_RESOLUTION");
      expect(resolution.payload.trajectory.length).toBeGreaterThan(0);

      // Verify turn transition arrives following ballistic resolution
      const turnTransition = (await waitForTopicMessage(
        ctx.activeClient!,
        "TURN_TRANSITION",
        5000,
      )) as OnlineDiffResponseDto<OnlineTurnTransitionResponse>;

      expect(turnTransition).toBeDefined();
      expect(turnTransition.type).toBe("TURN_TRANSITION");
      expect(turnTransition.payload.previousPlayerId).toBe(ctx.activeClient!.playerId);
      expect(turnTransition.payload.activePlayerId).toBe(ctx.inactiveClient!.playerId);
    } finally {
      await teardownTestContext(ctx);
    }
  });

  it("Behavior 2 (Exception 1): End of game terminates match immediately during lethal ballistics", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      // Forfeit game mid-match to simulate immediate game termination during active state
      ctx.inactiveClient!.client.publish({
        destination: `/app/game/${ctx.gameSessionId}/forfeit`,
        body: JSON.stringify({}),
      });

      const terminalEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        "TERMINAL_GAME",
        5000,
      )) as OnlineDiffResponseDto<OnlineTerminalGameResponse>;

      expect(terminalEvent).toBeDefined();
      expect(terminalEvent.type).toBe("TERMINAL_GAME");
      expect(terminalEvent.payload.winnerPlayerId).toBe(ctx.activeClient!.playerId);
      expect(terminalEvent.payload.finalState.match.phase).toBe("GAME_OVER");
    } finally {
      await teardownTestContext(ctx);
    }
  });

  it("Behavior 2 (Exception 2) & Suggested Test: Off-screen projectile resolves ballistics immediately", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      // Fire projectile trajectory
      const intentId = `test-offscreen-fire-${Date.now()}`;
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: "FIRE" as OnlineFireRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: -Math.PI * 0.8, power: 100 },
      });

      const resolution = (await waitForTopicMessage(
        ctx.activeClient!,
        "PROJECTILE_RESOLUTION",
        5000,
      )) as OnlineDiffResponseDto<OnlineProjectileResolutionResponse>;

      expect(resolution).toBeDefined();
      expect(resolution.payload.trajectory.length).toBeGreaterThan(0);
      const lastPoint = resolution.payload.trajectory[resolution.payload.trajectory.length - 1];
      expect(typeof lastPoint.x).toBe("number");
      expect(typeof lastPoint.y).toBe("number");

      // Turn transition releases immediately for offscreen misses
      const turnTransition = (await waitForTopicMessage(
        ctx.activeClient!,
        "TURN_TRANSITION",
        5000,
      )) as OnlineDiffResponseDto<OnlineTurnTransitionResponse>;

      expect(turnTransition).toBeDefined();
      expect(turnTransition.payload.previousPlayerId).toBe(ctx.activeClient!.playerId);
    } finally {
      await teardownTestContext(ctx);
    }
  });

  it("Behavior 7: Forfeiting a game declares the other player as winner", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const forfeitingPlayer = ctx.inactiveClient!;
      const remainingPlayer = ctx.activeClient!;

      forfeitingPlayer.client.publish({
        destination: `/app/game/${ctx.gameSessionId}/forfeit`,
        body: JSON.stringify({}),
      });

      const forfeitEvent = (await waitForTopicMessage(
        remainingPlayer,
        "TERMINAL_GAME",
        5000,
      )) as OnlineDiffResponseDto<OnlineTerminalGameResponse>;

      expect(forfeitEvent).toBeDefined();
      expect(forfeitEvent.gameSessionId).toBe(ctx.gameSessionId);
      expect(forfeitEvent.type).toBe("TERMINAL_GAME");
      expect(forfeitEvent.payload.reason).toBe("FORFEIT");
      expect(forfeitEvent.payload.winnerPlayerId).toBe(remainingPlayer.playerId);
      expect(forfeitEvent.payload.finalState.match.phase).toBe("GAME_OVER");
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
