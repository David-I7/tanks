import { describe, it, expect } from "vitest";
import type {
  OnlineMoveRequest,
  OnlineIntentRejectionResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForReply,
} from "../../harnessUtils";

describe("INTENT_REJECTION Diff Response & Inactive Player Rejection", () => {
  it("rejects intent sent by inactive player and sends INTENT_REJECTION diff response on user reply queue", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-inactive-${Date.now()}`;
      const moveIntentType: OnlineMoveRequest["type"] = "MOVE";

      sendIntent(ctx.inactiveClient!, ctx.gameSessionId!, {
        intentId,
        type: moveIntentType,
        playerId: ctx.inactiveClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: 1 },
      });

      const errorReply = (await waitForReply(
        ctx.inactiveClient!,
        "INTENT_REJECTION",
        5000,
      )) as OnlineDiffResponseDto<OnlineIntentRejectionResponse>;

      expect(errorReply).toBeDefined();
      expect(errorReply.gameSessionId).toBe(ctx.gameSessionId);
      expect(errorReply.type).toBe("INTENT_REJECTION");
      expect(errorReply.intentId).toBe(intentId);

      const payload = errorReply.payload;
      expect(payload.playerId).toBe(ctx.inactiveClient!.playerId);
      expect(payload.reason).toBe("NOT_ACTIVE_PLAYER");
      expect(typeof payload.authoritativeSequence).toBe("number");
      expect(typeof payload.authoritativeServerTick).toBe("number");
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
