import { describe, it, expect } from "vitest";
import type {
  OnlineFireRequest,
  OnlineSelectProjectileSlotRequest,
  OnlineAimRequest,
  OnlineAimUpdateResponse,
  OnlineProjectileResolutionResponse,
  OnlineIntentRejectionResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  sendIntentWithReceipt,
  waitForTopicMessage,
  waitForReply,
  waitForErrorReply,
} from "../../harnessUtils";

describe("Combat, Weapons & Damage Integration Suite", () => {
  it("reduces target player health when hit by a projectile", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-damage-fire-${Date.now()}`;
      const fireIntentType: OnlineFireRequest["type"] = "FIRE";

      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: fireIntentType,
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: -Math.PI / 4, power: 80 },
      });

      const resolutionEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        "PROJECTILE_RESOLUTION",
        5000,
      )) as OnlineDiffResponseDto<OnlineProjectileResolutionResponse>;

      expect(resolutionEvent).toBeDefined();
      expect(resolutionEvent.type).toBe("PROJECTILE_RESOLUTION");
      expect(resolutionEvent.payload.ownerPlayerId).toBe(ctx.activeClient!.playerId);
      expect(Array.isArray(resolutionEvent.payload.damagedTanks)).toBe(true);

      for (const tankDamage of resolutionEvent.payload.damagedTanks) {
        expect(typeof tankDamage.damage).toBe("number");
        expect(tankDamage.damage).toBeGreaterThan(0);
        expect(typeof tankDamage.healthAfter).toBe("number");
        expect(tankDamage.healthAfter).toBeLessThan(100);
      }
    } finally {
      await teardownTestContext(ctx);
    }
  });

  it("deals multi-hit damage from submunitions when cluster weapon is fired", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      await sendIntentWithReceipt(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-select-cluster-${Date.now()}`,
        type: "SELECT_PROJECTILE_SLOT" as OnlineSelectProjectileSlotRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { slot: 3 },
      });

      const fireIntentId = `test-cluster-fire-${Date.now()}`;
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: fireIntentId,
        type: "FIRE" as OnlineFireRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: -Math.PI / 3, power: 75 },
      });

      const resolutionEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        "PROJECTILE_RESOLUTION",
        5000,
      )) as OnlineDiffResponseDto<OnlineProjectileResolutionResponse>;

      expect(resolutionEvent).toBeDefined();
      expect(resolutionEvent.payload.projectileDefinitionId).toBe("cluster");
      expect(Array.isArray(resolutionEvent.payload.subMunitions)).toBe(true);
      expect(resolutionEvent.payload.subMunitions.length).toBe(3);

      for (const sub of resolutionEvent.payload.subMunitions) {
        expect(sub.projectileDefinitionId).toBe("basicShell");
        expect(sub.launch).toBeDefined();
        expect(Array.isArray(sub.trajectory)).toBe(true);
        expect(sub.trajectory.length).toBeGreaterThan(0);
        expect(sub.impact).toBeDefined();
        expect(Array.isArray(sub.damagedTanks)).toBe(true);
      }
    } finally {
      await teardownTestContext(ctx);
    }
  });

  it("generates damage trail persistent effects on impact for hazard weapons", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-trail-fire-${Date.now()}`;
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: "FIRE" as OnlineFireRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: -Math.PI / 4, power: 50 },
      });

      const resolutionEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        "PROJECTILE_RESOLUTION",
        5000,
      )) as OnlineDiffResponseDto<OnlineProjectileResolutionResponse>;

      expect(resolutionEvent).toBeDefined();
      expect(resolutionEvent.payload.impact).toBeDefined();
      expect(typeof resolutionEvent.payload.impact.x).toBe("number");
      expect(typeof resolutionEvent.payload.impact.y).toBe("number");
      expect(resolutionEvent.payload.trajectory.length).toBeGreaterThan(0);
    } finally {
      await teardownTestContext(ctx);
    }
  });

  it("updates active weapon slot for subsequent projectile firing", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      await sendIntentWithReceipt(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-weapon-select-heavy-${Date.now()}`,
        type: "SELECT_PROJECTILE_SLOT" as OnlineSelectProjectileSlotRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { slot: 2 },
      });

      const fireIntentId = `test-heavy-fire-${Date.now()}`;
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: fireIntentId,
        type: "FIRE" as OnlineFireRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: -Math.PI / 4, power: 60 },
      });

      const resolutionEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        "PROJECTILE_RESOLUTION",
        5000,
      )) as OnlineDiffResponseDto<OnlineProjectileResolutionResponse>;

      expect(resolutionEvent).toBeDefined();
      expect(resolutionEvent.payload.projectileDefinitionId).toBe("heavyShell");
    } finally {
      await teardownTestContext(ctx);
    }
  });

  it("processes valid AIM intent and broadcasts AIM_UPDATE diff response", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-aim-${Date.now()}`;
      const aimAngle = -Math.PI / 3;
      const aimPower = 75;

      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: "AIM" as OnlineAimRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: aimAngle, power: aimPower },
      });

      const diffEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        "AIM_UPDATE",
        5000,
      )) as OnlineDiffResponseDto<OnlineAimUpdateResponse>;

      expect(diffEvent).toBeDefined();
      expect(diffEvent.type).toBe("AIM_UPDATE");
      expect(diffEvent.intentId).toBe(intentId);
      expect(diffEvent.payload.playerId).toBe(ctx.activeClient!.playerId);
      expect(diffEvent.payload.angle).toBe(aimAngle);
      expect(diffEvent.payload.power).toBe(aimPower);
    } finally {
      await teardownTestContext(ctx);
    }
  });

  it("rejects AIM intent with out-of-range power payload and returns INTENT_REJECTION diff response", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-invalid-aim-${Date.now()}`;

      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: "AIM" as OnlineAimRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 9999 },
      });

      const errorReply = (await waitForReply(
        ctx.activeClient!,
        "INTENT_REJECTION",
        5000,
      )) as OnlineDiffResponseDto<OnlineIntentRejectionResponse>;

      expect(errorReply).toBeDefined();
      expect(errorReply.payload.playerId).toBe(ctx.activeClient!.playerId);
      expect(errorReply.payload.reason).toBe("INVALID_PAYLOAD");
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
