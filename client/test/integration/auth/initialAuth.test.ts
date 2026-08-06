import { describe, it, expect } from "vitest";
import {
  createIsolatedTestContext,
  teardownTestContext,
} from "../harnessUtils";

describe("Initial Auth", () => {
  it("retrieves authenticated accessTokens for 2 players", async () => {
    const ctx = await createIsolatedTestContext({ setupType: "auth" });
    try {
      expect(ctx.authData?.players[0].accessToken).toBeDefined();
      expect(ctx.authData?.players[1].accessToken).toBeDefined();
      expect(ctx.authData?.players[0].id).toBe(1);
      expect(ctx.authData?.players[1].id).toBe(2);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
