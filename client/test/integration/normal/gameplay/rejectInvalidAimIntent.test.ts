import { describe, it, expect } from "vitest";
import type {
  OnlineAimRequest,
  OnlineIntentRejectionResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForReply,
} from "../../harnessUtils";

describe("Invalid AIM Intent & INTENT_REJECTION Diff Response", () => {
  it("rejects AIM intent with out-of-range power payload and returns INTENT_REJECTION diff response", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-aim-invalid-${Date.now()}`;
      const aimIntentType: OnlineAimRequest["type"] = "AIM";

      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: aimIntentType,
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
      expect(errorReply.gameSessionId).toBe(ctx.gameSessionId);
      expect(errorReply.type).toBe("INTENT_REJECTION");
      expect(errorReply.intentId).toBe(intentId);

      const payload = errorReply.payload;
      expect(payload.playerId).toBe(ctx.activeClient!.playerId);
      expect(payload.reason).toBe("INVALID_PAYLOAD");
      expect(typeof payload.authoritativeSequence).toBe("number");
      expect(typeof payload.authoritativeServerTick).toBe("number");
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
