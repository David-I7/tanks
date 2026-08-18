import { describe, it, expect, vi } from "vitest";
import {
  isOnlineDiffBatchResponseDto,
  type OnlineDiffBatchResponseDto,
  type OnlineDiffResponseDto,
} from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import { createOnlineGameManager } from "../../../../src/game/authority/OnlineGameManager";
import { IntentThrottler } from "../../../../src/game/online/IntentThrottler";
import { createOnlineGameplayTransport } from "../../../../src/game/online/OnlineGameplayTransport";

describe("OnlineDiffBatchResponseDto & Batch Handling", () => {
  it("type guard correctly identifies batch response DTO", () => {
    const validBatch: OnlineDiffBatchResponseDto = {
      gameSessionId: "session-123",
      sequence: 5,
      serverTick: 100,
      intentId: "intent-fire-1",
      diffs: [
        {
          gameSessionId: "session-123",
          sequence: 5,
          serverTick: 100,
          type: "PROJECTILE_RESOLUTION",
          intentId: "intent-fire-1",
          payload: {
            projectileEntityId: 1,
            ownerPlayerId: 1,
            projectileDefinitionId: "basicShell",
            launch: { x: 100, y: 100 },
            trajectory: [{ x: 100, y: 100 }, { x: 200, y: 200 }],
            impact: { x: 200, y: 200 },
            damagedTanks: [],
            subMunitions: [],
          },
        },
        {
          gameSessionId: "session-123",
          sequence: 6,
          serverTick: 100,
          type: "TERRAIN_PATCH",
          intentId: "intent-fire-1",
          payload: { patches: [] },
        },
        {
          gameSessionId: "session-123",
          sequence: 7,
          serverTick: 100,
          type: "TURN_TRANSITION",
          intentId: "intent-fire-1",
          payload: {
            previousPlayerId: 1,
            activePlayerId: 2,
            turnNumber: 2,
            phase: "AIMING",
            turnEndsAtServerTick: 1000,
            matchEndsAtServerTick: 5400,
            wind: 10,
          },
        },
      ],
    };

    expect(isOnlineDiffBatchResponseDto(validBatch)).toBe(true);
    expect(isOnlineDiffBatchResponseDto({ type: "AIM_UPDATE" })).toBe(false);
    expect(isOnlineDiffBatchResponseDto(null)).toBe(false);
  });

  it("OnlineGameplayTransport subscribes and passes OnlineDiffBatchResponseDto to listener", () => {
    const publishedMessages: any[] = [];
    const mockClient = {
      send: vi.fn(),
      subscribe: vi.fn(({ onMessage }) => {
        publishedMessages.push(onMessage);
        return () => {};
      }),
    };

    const transport = createOnlineGameplayTransport({
      client: mockClient as any,
      gameSessionId: "session-123",
    });

    const receivedDiffs: any[] = [];
    transport.subscribeToStateDiffs((diff) => {
      receivedDiffs.push(diff);
    });

    const batch: OnlineDiffBatchResponseDto = {
      gameSessionId: "session-123",
      sequence: 1,
      serverTick: 10,
      intentId: "intent-1",
      diffs: [
        {
          gameSessionId: "session-123",
          sequence: 1,
          serverTick: 10,
          type: "AIM_UPDATE",
          intentId: "intent-1",
          payload: { playerId: 1, angle: -0.5, power: 50 },
        },
      ],
    };

    // Simulate WS message
    for (const handler of publishedMessages) {
      handler({ body: batch });
    }

    expect(receivedDiffs.length).toBeGreaterThan(0);
    expect(receivedDiffs[0]).toEqual(batch);
  });

  it("OnlineGameManager processes batched diffs sequentially without OnlineDiffSequenceError", () => {
    const mockTransport = {
      sendPlayerIntent: vi.fn(),
      requestResyncState: vi.fn(),
      subscribeToStateDiffs: vi.fn((listener) => {
        // Emit INITIAL_STATE (seq 1)
        listener({
          gameSessionId: "session-123",
          sequence: 1,
          serverTick: 0,
          type: "INITIAL_STATE",
          intentId: null,
          payload: {
            expectedNextDiffSequence: 2,
            localPlayerId: 1,
            state: {
              gameContentVersion: "1.0",
              gameContent: {
                version: "1.0",
                world: {
                  biome: "forest",
                  width: 2400,
                  height: 1000,
                  tickRateHz: 30,
                  gravity: 9.8,
                  projectileTimeStepSeconds: 0.033,
                  maxProjectileSteps: 300,
                  movementSegmentDurationTicks: 30,
                  playerASpawnRegion: { minX: 100, maxX: 500 },
                  playerBSpawnRegion: { minX: 1900, maxX: 2300 },
                  minWind: -50,
                  maxWind: 50,
                },
                tanks: {
                  vanguard: {
                    id: "vanguard",
                    name: "Vanguard",
                    maxHealth: 100,
                    maxFuel: 100,
                    movementQuantum: 10,
                    fuelRate: 1,
                    climbCapability: 5,
                    width: 40,
                    height: 20,
                    visual: { fillStyle: "red", strokeStyle: "black", accentColor: "yellow", label: "V" },
                    loadout: ["basicShell"],
                  },
                },
                projectiles: {
                  basicShell: {
                    id: "basicShell",
                    name: "Basic Shell",
                    label: "Basic",
                    radius: 5,
                    baseVelocity: 100,
                    gravityScale: 1,
                    drag: 0,
                    terrainEffectType: "CRATER",
                    terrainRadius: 20,
                    terrainDepth: 10,
                    damageEffectType: "RADIAL",
                    damageRadius: 30,
                    damage: 25,
                    subMunitions: null,
                    damageTrail: null,
                  },
                },
              },
              match: {
                phase: "AIMING",
                activePlayerId: 1,
                playerCount: 2,
                turnNumber: 1,
                turnTimeRemainingTicks: 900,
                winnerPlayerId: null,
                wind: 0,
                matchTimeRemainingTicks: 5400,
                biome: "forest",
              },
              terrain: {
                kind: "HEIGHTMAP",
                width: 2400,
                height: 1000,
                surface: new Array(2400).fill(500),
              },
              tanks: [
                {
                  entityId: 1,
                  playerId: 1,
                  displayName: "Player 1",
                  tankDefinitionId: "vanguard",
                  width: 40,
                  height: 20,
                  visual: { fillStyle: "red", strokeStyle: "black", accentColor: "yellow", label: "V" },
                  position: { x: 200, y: 480 },
                  facing: 1,
                  aimAngle: -0.785,
                  power: 500,
                  selectedProjectileSlotId: "basicShell",
                  loadout: ["basicShell"],
                  health: 100,
                  maxHealth: 100,
                  fuel: 100,
                  alive: true,
                },
                {
                  entityId: 2,
                  playerId: 2,
                  displayName: "Player 2",
                  tankDefinitionId: "vanguard",
                  width: 40,
                  height: 20,
                  visual: { fillStyle: "red", strokeStyle: "black", accentColor: "yellow", label: "V" },
                  position: { x: 2000, y: 480 },
                  facing: -1,
                  aimAngle: -2.356,
                  power: 500,
                  selectedProjectileSlotId: "basicShell",
                  loadout: ["basicShell"],
                  health: 100,
                  maxHealth: 100,
                  fuel: 100,
                  alive: true,
                },
              ],
              projectiles: [],
              lootCrates: [],
              damageTrails: [],
            },
          },
        });
        return () => {};
      }),
      subscribeToGameEvents: vi.fn(),
      destroy: vi.fn(),
    };

    const ctx: any = {
      gameContent: {
        world: { width: 2400, height: 1000, tickRateHz: 30, projectileTimeStepSeconds: 0.033 },
        tanks: {},
        projectiles: {},
      },
      clock: () => 1000,
      generateIntentId: () => "intent-1",
    };

    const manager = createOnlineGameManager({
      transport: mockTransport as any,
      ctx,
      throttler: new IntentThrottler({ aimIntervalMs: 80, moveIntervalMs: 100 }),
    });

    expect(manager.isReady()).toBe(true);

    const batchMsg: OnlineDiffBatchResponseDto = {
      gameSessionId: "session-123",
      sequence: 2,
      serverTick: 30,
      intentId: "fire-intent-1",
      diffs: [
        {
          gameSessionId: "session-123",
          sequence: 2,
          serverTick: 30,
          type: "PROJECTILE_RESOLUTION",
          intentId: "fire-intent-1",
          payload: {
            projectileEntityId: 20,
            ownerPlayerId: 1,
            projectileDefinitionId: "basicShell",
            launch: { x: 200, y: 480 },
            trajectory: [{ x: 200, y: 480 }, { x: 1000, y: 500 }],
            impact: { x: 1000, y: 500 },
            damagedTanks: [],
            subMunitions: [],
          },
        },
        {
          gameSessionId: "session-123",
          sequence: 3,
          serverTick: 30,
          type: "TERRAIN_PATCH",
          intentId: "fire-intent-1",
          payload: {
            patches: [{ kind: "HEIGHTMAP_RANGE", startX: 990, surface: [510, 510, 510] }],
          },
        },
        {
          gameSessionId: "session-123",
          sequence: 4,
          serverTick: 30,
          type: "TURN_TRANSITION",
          intentId: "fire-intent-1",
          payload: {
            previousPlayerId: 1,
            activePlayerId: 2,
            turnNumber: 2,
            phase: "AIMING",
            turnEndsAtServerTick: 930,
            matchEndsAtServerTick: 5400,
            wind: 15,
          },
        },
      ],
    };

    // Emit batch message through transport listener callback
    const listener = mockTransport.subscribeToStateDiffs.mock.calls[0][0];
    expect(() => listener(batchMsg)).not.toThrow();

    // Advance time for visual flight and post-impact delay completion
    manager.update(1.0);

    const state = manager.getState();
    expect(state.match.activePlayerId).toBe(2);
    expect(state.match.turnNumber).toBe(2);
    expect(state.match.wind).toBe(15);
  });
});

