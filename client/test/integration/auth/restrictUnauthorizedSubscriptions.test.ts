import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForErrorReply,
  waitForStompError,
} from "../harnessUtils";

describe("Unauthorized Topic Subscription", () => {
  it("rejects subscription attempt to an unauthorized topic", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "connect",
      playerCount: 1,
    });
    try {
      const unauthorizedLobbyId = "00000000-0000-0000-0000-000000000000";
      const topic = `/topic/lobby/${unauthorizedLobbyId}`;

      ctx.playerClients[0]!.client.subscribe(topic, () => {});

      // Check if subscription throws immediately or receives an error on queue
      const errorReply = await waitForStompError(ctx.playerClients[0]!, 3000);
      expect(errorReply).toEqual(
        expect.objectContaining({
          status: 401,
          title: "Unauthorized",
          detail: "User is not in the provided lobby.",
        }),
      );
    } finally {
      teardownTestContext(ctx);
    }
  });
});
