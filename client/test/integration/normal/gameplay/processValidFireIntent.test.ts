import { describe, it, expect } from "vitest";
import type {
  OnlineFireRequest,
  OnlineProjectileResolutionResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("PROJECTILE_RESOLUTION Diff Response & Valid FIRE Intent", () => {
  it("processes valid FIRE intent for active player and generates PROJECTILE_RESOLUTION diff response", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-fire-${Date.now()}`;
      const fireIntentType: OnlineFireRequest["type"] = "FIRE";
      const resolutionType: OnlineProjectileResolutionResponse["type"] =
        "PROJECTILE_RESOLUTION";
      const testAngle = -Math.PI / 4;
      const testPower = 80;

      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: fireIntentType,
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: testAngle, power: testPower },
      });

      const resolutionEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        resolutionType,
        5000,
      )) as OnlineDiffResponseDto<OnlineProjectileResolutionResponse>;

      expect(resolutionEvent).toBeDefined();
      expect(resolutionEvent.gameSessionId).toBe(ctx.gameSessionId);
      expect(resolutionEvent.type).toBe("PROJECTILE_RESOLUTION");
      expect(resolutionEvent.intentId).toBe(intentId);
      expect(typeof resolutionEvent.sequence).toBe("number");
      expect(typeof resolutionEvent.serverTick).toBe("number");

      const payload = resolutionEvent.payload;
      expect(payload.ownerPlayerId).toBe(ctx.activeClient!.playerId);
      expect(typeof payload.projectileEntityId).toBe("number");
      expect(typeof payload.projectileDefinitionId).toBe("string");
      expect(payload.launch).toBeDefined();
      expect(typeof payload.launch.x).toBe("number");
      expect(typeof payload.launch.y).toBe("number");
      expect(Array.isArray(payload.trajectory)).toBe(true);
      expect(payload.trajectory.length).toBeGreaterThan(0);
      expect(payload.impact).toBeDefined();
      expect(typeof payload.impact.x).toBe("number");
      expect(typeof payload.impact.y).toBe("number");
      expect(Array.isArray(payload.damagedTanks)).toBe(true);
      expect(Array.isArray(payload.subMunitions)).toBe(true);
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
