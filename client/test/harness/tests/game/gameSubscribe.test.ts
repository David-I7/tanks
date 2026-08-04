import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext, setupGameTopicSubscription, sleep } from "../../harnessUtils";

describe("[GAME] Subscribe Game Topic", () => {
  it("subscribes players to game topic", async () => {
    const ctx = await createIsolatedTestContext({ game: true });
    try {
      expect(ctx.gameSessionId).toBeDefined();
      setupGameTopicSubscription(ctx.clientA!, ctx.gameSessionId!);
      setupGameTopicSubscription(ctx.clientB!, ctx.gameSessionId!);
      await sleep(500);
      expect(ctx.clientA!.subscriptions.has(`/topic/game/${ctx.gameSessionId}`)).toBe(true);
      expect(ctx.clientB!.subscriptions.has(`/topic/game/${ctx.gameSessionId}`)).toBe(true);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
