import { describe, it, expect } from "vitest";
import type {
  OnlineMoveRequest,
  OnlineMovementSegmentResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("MOVEMENT_SEGMENT Diff Response & Valid MOVE Intent", () => {
  it("processes valid MOVE intent for active player and returns MOVEMENT_SEGMENT diff response", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-move-${Date.now()}`;
      const moveIntentType: OnlineMoveRequest["type"] = "MOVE";
      const movementSegmentType: OnlineMovementSegmentResponse["type"] =
        "MOVEMENT_SEGMENT";

      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: moveIntentType,
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: 1 },
      });

      const diffEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        movementSegmentType,
        5000,
      )) as OnlineDiffResponseDto<OnlineMovementSegmentResponse>;

      expect(diffEvent).toBeDefined();
      expect(diffEvent.gameSessionId).toBe(ctx.gameSessionId);
      expect(diffEvent.type).toBe("MOVEMENT_SEGMENT");
      expect(diffEvent.intentId).toBe(intentId);
      expect(typeof diffEvent.sequence).toBe("number");
      expect(diffEvent.sequence).toBeGreaterThan(0);
      expect(typeof diffEvent.serverTick).toBe("number");

      const payload = diffEvent.payload;
      expect(payload.playerId).toBe(ctx.activeClient!.playerId);
      expect(typeof payload.tankEntityId).toBe("number");
      expect(payload.from).toBeDefined();
      expect(typeof payload.from.x).toBe("number");
      expect(typeof payload.from.y).toBe("number");
      expect(payload.to).toBeDefined();
      expect(typeof payload.to.x).toBe("number");
      expect(typeof payload.to.y).toBe("number");
      expect(Array.isArray(payload.movementPath)).toBe(true);
      expect(payload.movementPath.length).toBeGreaterThan(0);
      expect(typeof payload.fuelBefore).toBe("number");
      expect(typeof payload.fuelAfter).toBe("number");
      expect(typeof payload.fuelSpent).toBe("number");
      expect(payload.fuelSpent).toBe(payload.fuelBefore - payload.fuelAfter);
      expect(typeof payload.partial).toBe("boolean");
      expect(typeof payload.startedServerTick).toBe("number");
      expect(typeof payload.endedServerTick).toBe("number");
      expect(typeof payload.durationTicks).toBe("number");
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
