import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForErrorReply,
  waitForReply,
} from "../harnessUtils";

describe("Private Lobby", () => {
  it("rejects private lobby creation if tankId is missing", async () => {
    const ctx = await createIsolatedTestContext({ setupType: "connect" });
    try {
      ctx.playerClients[0]!.client.publish({
        destination: "/app/lobby/create/private",
        body: JSON.stringify({}),
      });

      const reply = await waitForErrorReply(ctx.playerClients[0]!, 500);
      console.log(reply);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
