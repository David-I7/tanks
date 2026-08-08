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

describe("MOVEMENT_SEGMENT Diff Response & Partial Movement", () => {
  it("sets partial flag to true on MOVEMENT_SEGMENT when tank movement is truncated due to insufficient fuel", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const moveIntentType: OnlineMoveRequest["type"] = "MOVE";
      const movementSegmentType: OnlineMovementSegmentResponse["type"] =
        "MOVEMENT_SEGMENT";

      let lastDiff: OnlineDiffResponseDto<OnlineMovementSegmentResponse> | null = null;
      let currentSeq = 1;
      let currentTick = 0;

      // Send consecutive move intents until fuel is depleted mid-quantum
      for (let i = 0; i < 30; i++) {
        ctx.activeClient!.receivedTopicMessages.length = 0;
        const intentId = `test-partial-move-${i}-${Date.now()}`;
        sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
          intentId,
          type: moveIntentType,
          playerId: ctx.activeClient!.playerId,
          lastConfirmedDiffSequence: currentSeq,
          lastConfirmedDiffServerTick: currentTick,
          payload: { direction: -1 },
        });

        const diffEvent = (await waitForTopicMessage(
          ctx.activeClient!,
          movementSegmentType,
          5000,
        )) as OnlineDiffResponseDto<OnlineMovementSegmentResponse>;

        lastDiff = diffEvent;
        currentSeq = diffEvent.sequence;
        currentTick = diffEvent.serverTick;

        if (diffEvent.payload.partial || diffEvent.payload.fuelAfter <= 0) {
          break;
        }
      }

      expect(lastDiff).toBeDefined();
      expect(lastDiff!.type).toBe("MOVEMENT_SEGMENT");
      expect(lastDiff!.payload.playerId).toBe(ctx.activeClient!.playerId);
      expect(typeof lastDiff!.payload.partial).toBe("boolean");
      expect(lastDiff!.payload.partial).toBe(true);
      expect(lastDiff!.payload.fuelAfter).toBeLessThanOrEqual(1);
    } finally {
      await teardownTestContext(ctx);
    }
  }, 15000);
});
