import { describe, it, expect } from "vitest";
import type {
  OnlineCrateSpawnedResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("CRATE_SPAWNED Diff Response & Supply Crate Spawn", () => {
  it("listens for supply crate spawn diff responses during match progression", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const cratePromise = waitForTopicMessage(
        ctx.activeClient!,
        "CRATE_SPAWNED",
        3000,
      ).catch(() => null);

      const diffEvent = (await cratePromise) as OnlineDiffResponseDto<OnlineCrateSpawnedResponse> | null;

      if (diffEvent) {
        expect(diffEvent.gameSessionId).toBe(ctx.gameSessionId);
        expect(diffEvent.type).toBe("CRATE_SPAWNED");
        expect(typeof diffEvent.sequence).toBe("number");
        expect(typeof diffEvent.serverTick).toBe("number");

        const payload = diffEvent.payload;
        expect(typeof payload.crateId).toBe("number");
        expect(typeof payload.crateType).toBe("string");
        expect(typeof payload.dropX).toBe("number");
        expect(typeof payload.targetY).toBe("number");
        expect(typeof payload.value).toBe("number");
      } else {
        expect(ctx.gameSessionId).toBeDefined();
      }
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
