import { describe, it, expect, vi } from "vitest";
import { createOnlineGameManager } from "../../../../src/game/authority/OnlineGameManager";
import { IntentThrottler } from "../../../../src/game/online/IntentThrottler";
import type { OnlineGameplayTransport } from "../../../../src/game/online/OnlineGameplayTransport";
import type { OnlineDiffResponseDto, OnlineGameStateSnapshotResponse } from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import { testGameContent } from "./mockOnlineTestState";
import { clampAimAngle } from "../../../../src/game/simulation/ballistics";

function createMockInitialStateDiff(): OnlineDiffResponseDto {
  const mockSnapshot: OnlineGameStateSnapshotResponse = {
    gameContentVersion: "v1.0",
    gameContent: {
      version: testGameContent.version,
      world: {
        biomes: testGameContent.world.biomes,
        width: testGameContent.world.width,
        height: testGameContent.world.height,
        tickRateHz: testGameContent.world.tickRateHz,
        gravity: testGameContent.world.gravity,
        deltaTime: testGameContent.world.projectileTimeStepSeconds,
        maxProjectileSteps: testGameContent.world.maxProjectileSteps,
        movementSegmentDurationTicks: testGameContent.world.movementSegmentDurationTicks,
        playerASpawnRegion: { minX: 240, maxX: 800 },
        playerBSpawnRegion: { minX: 1600, maxX: 2160 },
        minWind: testGameContent.world.minWind,
        maxWind: testGameContent.world.maxWind,
        turnDurationSeconds: testGameContent.world.turnDurationSeconds,
        matchDurationSeconds: testGameContent.world.matchDurationSeconds,
        postImpactDelaySeconds: testGameContent.world.postImpactDelaySeconds,
        lootCrates: testGameContent.world.lootCrates,
      },
      tanks: Object.fromEntries(
        Object.entries(testGameContent.tanks).map(([id, tank]) => [
          id,
          {
            id: tank.id,
            name: tank.name,
            maxHealth: tank.maxHealth,
            maxFuel: tank.maxFuel,
            movementQuantum: tank.movementQuantum,
            fuelRate: tank.fuelRate,
            climbCapability: tank.climbCapability,
            width: tank.width,
            height: tank.height,
            barrelLength: tank.barrelLength,
            turretYOffset: tank.turretYOffset,
            visual: {
              fillStyle: tank.visual.fill,
              strokeStyle: tank.visual.stroke,
              accentColor: tank.visual.accent,
              label: tank.visual.label,
            },
            loadout: tank.loadout,
          },
        ]),
      ),
      projectiles: Object.fromEntries(
        Object.entries(testGameContent.projectiles).map(([id, proj]) => [
          id,
          {
            id: proj.id,
            name: proj.name,
            label: proj.label,
            radius: proj.radius,
            baseVelocity: proj.baseVelocity,
            gravityScale: proj.gravityScale,
            isDefault: proj.isDefault,
            terrainEffectType: proj.terrainEffectType,
            terrainRadius: proj.terrainRadius,
            terrainDepth: proj.terrainDepth,
            damageEffectType: proj.damageEffectType,
            damageRadius: proj.damageRadius,
            damage: proj.damage,
            subMunitions: proj.subMunitions,
            damageTrail: proj.damageTrail,
          },
        ]),
      ),
    },
    match: {
      phase: "AIMING",
      activePlayerId: 1,
      playerCount: 2,
      turnNumber: 1,
      turnTimeRemainingTicks: 900,
      winnerPlayerId: null,
      matchTimeRemainingTicks: 5400,
      wind: 0,
      biome: "forest",
    },
    terrain: {
      kind: "HEIGHTMAP",
      width: 2400,
      height: 768,
      surface: new Array(2400).fill(400),
    },
    tanks: [
      {
        entityId: 10,
        playerId: 1,
        displayName: "Player 1",
        tankDefinitionId: "vanguard-cyber",
        width: 24,
        height: 24,
        visual: { fillStyle: "#3b82f6", strokeStyle: "#1d4ed8", accentColor: "#60a5fa", label: "VC" },
        position: { x: 200, y: 388 },
        facing: 1,
        aimAngle: 45,
        power: 300,
        selectedProjectileSlotId: "basicShell",
        loadout: ["basicShell"],
        health: 100,
        maxHealth: 100,
        fuel: 240,
        alive: true,
      },
    ],
    projectiles: [],
    lootCrates: [],
    damageTrails: [],
  };

  return {
    gameSessionId: "test-session-123",
    sequence: 1,
    serverTick: 0,
    type: "INITIAL_STATE",
    intentId: null,
    payload: {
      localPlayerId: 1,
      expectedNextDiffSequence: 2,
      state: mockSnapshot,
    },
  };
}

describe("OnlineGameManager Throttling Integration", () => {
  it("updates local state on aim immediately, but throttles AIM player intents", () => {
    let diffSubscriber: ((diff: OnlineDiffResponseDto) => void) | null = null;
    const sentIntents: any[] = [];
    const transportMock: OnlineGameplayTransport = {
      subscribeToStateDiffs: (cb) => {
        diffSubscriber = cb;
        return () => {};
      },
      requestResyncState: vi.fn(),
      sendPlayerIntent: vi.fn((dto) => {
        sentIntents.push(dto);
      }),
    };

    const ctx = {
      clock: () => 1000,
      generateIntentId: (() => {
        let count = 0;
        return () => `intent-${++count}`;
      })(),
      gameContent: testGameContent,
    };

    const throttler = new IntentThrottler({ aimIntervalMs: 80, moveIntervalMs: 180 });
    const manager = createOnlineGameManager({
      transport: transportMock,
      ctx: ctx as any,
      throttler,
    });

    // Provide initial state
    diffSubscriber!(createMockInitialStateDiff());

    // First aim action (at t=0 in performance.now) -> updates local state AND sends packet
    const res1 = manager.submitAction({ type: "aim", angle: 50, power: 350 });
    expect(res1).toBe(true);
    expect(sentIntents.length).toBe(1);
    expect(sentIntents[0].type).toBe("AIM");
    expect(sentIntents[0].payload).toEqual({ angle: clampAimAngle(50), power: 350 });
    expect(manager.getState().tanks[0].aimAngle).toBe(50);
    expect(manager.getState().tanks[0].power).toBe(350);

    // Second aim action immediately after -> updates local state BUT DOES NOT send packet
    const res2 = manager.submitAction({ type: "aim", angle: 60, power: 400 });
    expect(res2).toBe(true);
    expect(sentIntents.length).toBe(1); // still 1
    expect(manager.getState().tanks[0].aimAngle).toBe(60); // local rendering updated at 60fps!
    expect(manager.getState().tanks[0].power).toBe(400);
  });

  it("throttles MOVE intents and predicted movement steps", () => {
    let diffSubscriber: ((diff: OnlineDiffResponseDto) => void) | null = null;
    const sentIntents: any[] = [];
    const transportMock: OnlineGameplayTransport = {
      subscribeToStateDiffs: (cb) => {
        diffSubscriber = cb;
        return () => {};
      },
      requestResyncState: vi.fn(),
      sendPlayerIntent: vi.fn((dto) => {
        sentIntents.push(dto);
      }),
    };

    const ctx = {
      clock: () => 1000,
      generateIntentId: (() => {
        let count = 0;
        return () => `intent-${++count}`;
      })(),
      gameContent: testGameContent,
    };

    const throttler = new IntentThrottler({ aimIntervalMs: 80, moveIntervalMs: 180 });
    const manager = createOnlineGameManager({
      transport: transportMock,
      ctx: ctx as any,
      throttler,
    });

    diffSubscriber!(createMockInitialStateDiff());

    // First move
    const res1 = manager.submitAction({ type: "move", direction: 1 });
    expect(res1).toBe(true);
    expect(sentIntents.length).toBe(1);
    expect(sentIntents[0].type).toBe("MOVE");

    // Rapid second move (within 180ms)
    const res2 = manager.submitAction({ type: "move", direction: 1 });
    expect(res2).toBe(true);
    expect(sentIntents.length).toBe(1); // throttled!
  });

  it("does not throttle one-shot actions like selectProjectileSlot or fire", () => {
    let diffSubscriber: ((diff: OnlineDiffResponseDto) => void) | null = null;
    const sentIntents: any[] = [];
    const transportMock: OnlineGameplayTransport = {
      subscribeToStateDiffs: (cb) => {
        diffSubscriber = cb;
        return () => {};
      },
      requestResyncState: vi.fn(),
      sendPlayerIntent: vi.fn((dto) => {
        sentIntents.push(dto);
      }),
    };

    const ctx = {
      clock: () => 1000,
      generateIntentId: (() => {
        let count = 0;
        return () => `intent-${++count}`;
      })(),
      gameContent: testGameContent,
    };

    const manager = createOnlineGameManager({
      transport: transportMock,
      ctx: ctx as any,
      throttler: new IntentThrottler({ aimIntervalMs: 80, moveIntervalMs: 100 }),
    });

    diffSubscriber!(createMockInitialStateDiff());

    manager.submitAction({ type: "selectProjectileSlot", projectileSlotId: "basicShell" });
    manager.submitAction({ type: "selectProjectileSlot", projectileSlotId: "basicShell" });

    expect(sentIntents.length).toBe(2);
    expect(sentIntents[0].type).toBe("SELECT_PROJECTILE_SLOT");
    expect(sentIntents[1].type).toBe("SELECT_PROJECTILE_SLOT");
  });
});
