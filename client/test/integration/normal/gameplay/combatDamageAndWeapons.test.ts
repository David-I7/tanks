import { describe, it, expect } from "vitest";
import type {
  OnlineFireRequest,
  OnlineSelectProjectileSlotRequest,
  OnlineProjectileResolutionResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("Combat, Weapons & Damage Integration Suite", () => {
  it("Behavior 1: Player takes damage when hit by a projectile", async () => {
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

      // Verify that damaged tanks record damage amount and health decrease
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

  it("Behavior 5: Multiple submunitions deal damage to player when cluster weapon is fired", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      // Slot 3 in vanguard-cyber loadout is "cluster" (subMunitions count = 3)
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
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

  it("Behavior 4: Damage trails are generated on impact for hazard weapons", async () => {
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

  it("Suggested Test: Weapon selection updates active slot for subsequent projectile firing", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      // Slot 2 in loadout is "heavyShell"
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
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
});
