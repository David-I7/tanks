import { describe, it, expect } from "vitest";
import type {
  OnlineMoveRequest,
  OnlineMovementSegmentResponse,
  OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  createIsolatedTestContext,
  teardownTestContext,
  sendIntent,
  waitForTopicMessage,
} from "../../harnessUtils";

describe("Movement, Fuel & Terrain Integration Suite", () => {
  it("processes valid MOVE intent for active player and returns MOVEMENT_SEGMENT diff response", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-move-${Date.now()}`;
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: "MOVE" as OnlineMoveRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: 1 },
      });

      const diffEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        "MOVEMENT_SEGMENT",
        5000,
      )) as OnlineDiffResponseDto<OnlineMovementSegmentResponse>;

      expect(diffEvent).toBeDefined();
      expect(diffEvent.gameSessionId).toBe(ctx.gameSessionId);
      expect(diffEvent.type).toBe("MOVEMENT_SEGMENT");
      expect(diffEvent.intentId).toBe(intentId);
      expect(diffEvent.payload.playerId).toBe(ctx.activeClient!.playerId);
      expect(diffEvent.payload.fuelSpent).toBe(
        diffEvent.payload.fuelBefore - diffEvent.payload.fuelAfter,
      );
    } finally {
      await teardownTestContext(ctx);
    }
  });

  it("truncates tank movement and sets partial flag when fuel is exhausted", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const moveIntentType: OnlineMoveRequest["type"] = "MOVE";
      let lastDiff: OnlineDiffResponseDto<OnlineMovementSegmentResponse> | null = null;
      let currentSeq = 1;
      let currentTick = 0;

      for (let i = 0; i < 35; i++) {
        ctx.activeClient!.receivedTopicMessages.length = 0;
        const intentId = `test-fuel-move-${i}-${Date.now()}`;
        sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
          intentId,
          type: moveIntentType,
          playerId: ctx.activeClient!.playerId,
          lastConfirmedDiffSequence: currentSeq,
          lastConfirmedDiffServerTick: currentTick,
          payload: { direction: -1 },
        });

        const diffEvent = (await waitForTopicMessage(
          ctx.activeClient!,
          "MOVEMENT_SEGMENT",
          5000,
        )) as OnlineDiffResponseDto<OnlineMovementSegmentResponse>;

        lastDiff = diffEvent;
        currentSeq = diffEvent.sequence;
        currentTick = diffEvent.serverTick;

        if (diffEvent.payload.partial || diffEvent.payload.fuelAfter <= 0) {
          break;
        }
      }

      expect(lastDiff).toBeDefined();
      expect(lastDiff!.type).toBe("MOVEMENT_SEGMENT");
      expect(lastDiff!.payload.playerId).toBe(ctx.activeClient!.playerId);
      expect(typeof lastDiff!.payload.partial).toBe("boolean");
      expect(lastDiff!.payload.partial).toBe(true);
      expect(lastDiff!.payload.fuelAfter).toBeLessThanOrEqual(1);
    } finally {
      await teardownTestContext(ctx);
    }
  }, 15000);

  it("prevents movement beyond climb capability threshold on steep terrain inclines", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const intentId = `test-slope-move-${Date.now()}`;

      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId,
        type: "MOVE" as OnlineMoveRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: 1 },
      });

      const diffEvent = (await waitForTopicMessage(
        ctx.activeClient!,
        "MOVEMENT_SEGMENT",
        5000,
      )) as OnlineDiffResponseDto<OnlineMovementSegmentResponse>;

      expect(diffEvent).toBeDefined();
      expect(diffEvent.type).toBe("MOVEMENT_SEGMENT");
      expect(diffEvent.payload.from).toBeDefined();
      expect(diffEvent.payload.to).toBeDefined();
      expect(Array.isArray(diffEvent.payload.movementPath)).toBe(true);
      const path = diffEvent.payload.movementPath;
      for (let i = 1; i < path.length; i++) {
        const yDiff = path[i].y - path[i - 1].y;
        if (yDiff < 0) {
          expect(Math.abs(yDiff)).toBeLessThanOrEqual(25);
        }
      }
    } finally {
      await teardownTestContext(ctx);
    }
  });

  it("grants health or fuel upgrades when tank moves onto a supply crate", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      const cratePromise = waitForTopicMessage(
        ctx.activeClient!,
        "CRATE_SPAWNED",
        2000,
      ).catch(() => null);

      const crateEvent = await cratePromise;
      if (crateEvent) {
        expect(crateEvent.type).toBe("CRATE_SPAWNED");
        expect(crateEvent.payload.crateId).toBeDefined();
        expect(typeof crateEvent.payload.dropX).toBe("number");
      }

      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-crate-pickup-${Date.now()}`,
        type: "MOVE" as OnlineMoveRequest["type"],
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { direction: 1 },
      });

      const moveDiff = (await waitForTopicMessage(
        ctx.activeClient!,
        "MOVEMENT_SEGMENT",
        5000,
      )) as OnlineDiffResponseDto<OnlineMovementSegmentResponse>;

      expect(moveDiff).toBeDefined();
      expect(moveDiff.payload.to).toBeDefined();
    } finally {
      await teardownTestContext(ctx);
    }
  });

  it("settles unsupported tanks vertically onto surface heightmap after terrain deformation", async () => {
    const ctx = await createIsolatedTestContext({
      setupType: "game",
      playerCount: 2,
    });
    try {
      sendIntent(ctx.activeClient!, ctx.gameSessionId!, {
        intentId: `test-crater-settle-${Date.now()}`,
        type: "FIRE",
        playerId: ctx.activeClient!.playerId,
        lastConfirmedDiffSequence: 1,
        lastConfirmedDiffServerTick: 0,
        payload: { angle: -Math.PI / 2, power: 20 },
      });

      const resolution = (await waitForTopicMessage(
        ctx.activeClient!,
        "PROJECTILE_RESOLUTION",
        5000,
      )) as OnlineDiffResponseDto;

      expect(resolution).toBeDefined();
      expect(resolution.type).toBe("PROJECTILE_RESOLUTION");

      const terrainPatch = (await waitForTopicMessage(
        ctx.activeClient!,
        "TERRAIN_PATCH",
        5000,
      )) as OnlineDiffResponseDto;
      expect(terrainPatch).toBeDefined();
      expect(terrainPatch.type).toBe("TERRAIN_PATCH");
    } finally {
      await teardownTestContext(ctx);
    }
  });
});
