import { describe, it, expect } from "vitest";
import type {
  OnlineDiffResponseDto,
  OnlineTerminalGameResponse,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("TERMINAL_GAME Diff Response & Game Forfeit", () => {
  it("concludes game and declares opponent as winner when player forfeits", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const forfeitingPlayer = ctx.inactiveClient!;
      const remainingPlayer = ctx.activeClient!;
      const terminalType: OnlineTerminalGameResponse["type"] = "TERMINAL_GAME";

      forfeitingPlayer.client.publish({
        destination: `/app/game/${ctx.gameSessionId}/forfeit`,
        body: JSON.stringify({}),
      });

      const forfeitEvent = (await waitForTopicMessage(
        remainingPlayer,
        terminalType,
        5000,
      )) as OnlineDiffResponseDto<OnlineTerminalGameResponse>;

      expect(forfeitEvent).toBeDefined();
      expect(forfeitEvent.gameSessionId).toBe(ctx.gameSessionId);
      expect(forfeitEvent.type).toBe("TERMINAL_GAME");
      expect(typeof forfeitEvent.sequence).toBe("number");
      expect(typeof forfeitEvent.serverTick).toBe("number");

      const payload = forfeitEvent.payload;
      expect(payload.reason).toBe("FORFEIT");
      expect(payload.winnerPlayerId).toBe(remainingPlayer.playerId);
      expect(payload.finalState).toBeDefined();
      expect(payload.finalState.match).toBeDefined();
      expect(payload.finalState.match.phase).toBe("GAME_OVER");
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
