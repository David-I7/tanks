import { describe, it, expect } from "vitest";
import { createIsolatedTestContext, teardownTestContext } from "../../harnessUtils";

describe("[AUTH] Initial Auth", () => {
  it("retrieves authenticated accessTokens for Player A and Player B", async () => {
    const ctx = await createIsolatedTestContext({ auth: true });
    try {
      expect(ctx.authData?.playerAToken).toBeDefined();
      expect(ctx.authData?.playerBToken).toBeDefined();
      expect(ctx.authData?.playerAId).toBe(1);
      expect(ctx.authData?.playerBId).toBe(2);
    } finally {
      teardownTestContext(ctx);
    }
  });
});
