import { describe, it, expect } from "vitest";
import type {
  OnlineSelectProjectileSlotRequest,
  OnlineAimRequest,
  OnlineAimUpdateResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("SELECT_PROJECTILE_SLOT Intent & Weapon Selection", () => {
  it("updates active player selected weapon slot when valid SELECT_PROJECTILE_SLOT intent is received", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const selectSlotType: OnlineSelectProjectileSlotRequest["type"] = "SELECT_PROJECTILE_SLOT";
      const aimIntentType: OnlineAimRequest["type"] = "AIM";
      const aimUpdateType: OnlineAimUpdateResponse["type"] = "AIM_UPDATE";

      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-weapon-select-${Date.now()}`,
        type: selectSlotType,
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { slot: 0 },
      });

      const aimIntentId = `test-aim-after-select-${Date.now()}`;
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: aimIntentId,
        type: aimIntentType,
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: 45, power: 100 },
      });

      const diffEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        aimUpdateType,
        5000,
      )) as OnlineDiffResponseDto<OnlineAimUpdateResponse>;

      expect(diffEvent).toBeDefined();
      expect(diffEvent.gameSessionId).toBe(ctx.gameSessionId);
      expect(diffEvent.type).toBe("AIM_UPDATE");
      expect(diffEvent.intentId).toBe(aimIntentId);
      expect(diffEvent.payload.playerId).toBe(ctx.activeClient!.playerId);
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
