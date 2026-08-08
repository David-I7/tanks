import { describe, it, expect } from "vitest";
import type {
  OnlineResyncStateResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForReply,
} from "../../harnessUtils";

describe("RESYNC_STATE Diff Response & Resync Request", () => {
  it("returns full authoritative RESYNC_STATE diff response when client requests resync", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const activePlayer = ctx.activeClient!;
      const expectedResyncType: OnlineResyncStateResponse["type"] =
        "RESYNC_STATE";

      activePlayer.client.publish({
        destination: `/app/game/${ctx.gameSessionId}/resync`,
        body: JSON.stringify({}),
      });

      const resyncReply = (await waitForReply(
        activePlayer,
        expectedResyncType,
        5000,
      )) as OnlineDiffResponseDto<OnlineResyncStateResponse>;

      expect(resyncReply).toBeDefined();
      expect(resyncReply.gameSessionId).toBe(ctx.gameSessionId);
      expect(resyncReply.type).toBe("RESYNC_STATE");
      expect(typeof resyncReply.sequence).toBe("number");
      expect(typeof resyncReply.serverTick).toBe("number");

      const payload = resyncReply.payload;
      expect(payload.localPlayerId).toBe(activePlayer.playerId);
      expect(typeof payload.replacesSequence).toBe("number");
      expect(payload.reason).toBeDefined();
      expect(payload.state).toBeDefined();
      expect(payload.state.gameContentVersion).toBeDefined();
      expect(payload.state.match).toBeDefined();
      expect(Array.isArray(payload.state.tanks)).toBe(true);
      expect(payload.state.terrain).toBeDefined();
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
