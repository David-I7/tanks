import { describe, it, expect } from "vitest";
import type {
  OnlineFireRequest,
  OnlineTerrainPatchResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("TERRAIN_PATCH Diff Response & Terrain Deformation", () => {
  it("broadcasts TERRAIN_PATCH diff response after projectile impact deforms terrain", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-fire-patch-${Date.now()}`;
      const fireIntentType: OnlineFireRequest["type"] = "FIRE";
      const terrainPatchType: OnlineTerrainPatchResponse["type"] = "TERRAIN_PATCH";

      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: fireIntentType,
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: -Math.PI / 4, power: 360 },
      });

      const patchEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        terrainPatchType,
        5000,
      )) as OnlineDiffResponseDto<OnlineTerrainPatchResponse>;

      expect(patchEvent).toBeDefined();
      expect(patchEvent.gameSessionId).toBe(ctx.gameSessionId);
      expect(patchEvent.type).toBe("TERRAIN_PATCH");
      expect(typeof patchEvent.sequence).toBe("number");
      expect(typeof patchEvent.serverTick).toBe("number");

      const payload = patchEvent.payload;
      expect(Array.isArray(payload.patches)).toBe(true);
      expect(payload.patches.length).toBeGreaterThan(0);
      const patch = payload.patches[0];
      expect(patch.kind).toBe("HEIGHTMAP_RANGE");
      expect(typeof patch.startX).toBe("number");
      expect(Array.isArray(patch.surface)).toBe(true);
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
