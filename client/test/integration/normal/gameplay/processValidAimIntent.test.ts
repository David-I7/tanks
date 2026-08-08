import { describe, it, expect } from "vitest";
import type {
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

describe("AIM_UPDATE Diff Response & Valid AIM Intent", () => {
  it("processes valid AIM intent for active player and broadcasts AIM_UPDATE diff response", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-aim-${Date.now()}`;
      const aimIntentType: OnlineAimRequest["type"] = "AIM";
      const aimUpdateType: OnlineAimUpdateResponse["type"] = "AIM_UPDATE";
      const testAngle = 45;
      const testPower = 50;

      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: aimIntentType,
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: testAngle, power: testPower },
      });

      const diffEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        aimUpdateType,
        5000,
      )) as OnlineDiffResponseDto<OnlineAimUpdateResponse>;

      expect(diffEvent).toBeDefined();
      expect(diffEvent.gameSessionId).toBe(ctx.gameSessionId);
      expect(diffEvent.type).toBe("AIM_UPDATE");
      expect(diffEvent.intentId).toBe(intentId);
      expect(typeof diffEvent.sequence).toBe("number");
      expect(typeof diffEvent.serverTick).toBe("number");

      const payload = diffEvent.payload;
      expect(payload.playerId).toBe(ctx.activeClient!.playerId);
      expect(payload.angle).toBe(testAngle);
      expect(payload.power).toBe(testPower);
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
