import { describe, it, expect } from "vitest";
import type {
  OnlineDiffResponseDto,
  OnlineTurnTransitionResponse,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("TURN_TRANSITION Diff Response & Turn Timer Expiration", () => {
  it("automatically switches turn and publishes TURN_TRANSITION diff response when active player turn timer expires", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const activePlayer = ctx.activeClient!;
      const turnTransitionType: OnlineTurnTransitionResponse["type"] =
        "TURN_TRANSITION";

      const turnSwitchEvent = (await waitForTopicMessage(
        activePlayer,
        turnTransitionType,
        35000,
      )) as OnlineDiffResponseDto<OnlineTurnTransitionResponse>;

      expect(turnSwitchEvent).toBeDefined();
      expect(turnSwitchEvent.gameSessionId).toBe(ctx.gameSessionId);
      expect(turnSwitchEvent.type).toBe("TURN_TRANSITION");
      expect(typeof turnSwitchEvent.sequence).toBe("number");
      expect(typeof turnSwitchEvent.serverTick).toBe("number");

      const payload = turnSwitchEvent.payload;
      expect(payload.previousPlayerId).toBe(ctx.activeClient!.playerId);
      expect(payload.activePlayerId).toBe(ctx.inactiveClient!.playerId);
      expect(payload.turnNumber).toBe(2);
      expect(payload.phase).toBe("AIMING");
      expect(typeof payload.turnEndsAtServerTick).toBe("number");
      expect(typeof payload.wind).toBe("number");
    } finally {
      await teardownTestContext(ctx);
    }
  }, 40000);
});
