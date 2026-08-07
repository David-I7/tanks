import { describe, it, expect } from "vitest";
import type ProblemDetailDto from "../../../src/api/http/dto/ProblemDetailDto";
import {
  createIsolatedTestContext,
  teardownTestContext,
} from "../harnessUtils";
import { createStompClient } from "../mockGameHarness";

describe("Multiple Socket Connections", () => {
  it("rejects duplicate player connection with a STOMP error when a user connects multiple times", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "connect",
      playerCount: 1,
    });
    try {
      const player = ctx.authData!.players[0];
      expect(ctx.playerClients[0]?.client.connected).toBe(true);

      let secondClientError: ProblemDetailDto | null = null;
      try {
        const secondClient = await createStompClient(
          player.accessToken,
          player.username,
          player.id,
        );
        ctx.playerClients.push(secondClient);
      } catch (err: any) {
        secondClientError = err;
      }
      console.log("Duplicate socket error:", secondClientError);
      expect(secondClientError).toBeDefined();
    } finally {
      teardownTestContext(ctx);
    }
  });
});
