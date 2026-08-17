import { describe, it, expect, vi } from "vitest";
import { createOnlineGameManager } from "../../../../src/game/authority/OnlineGameManager";
import type { OnlineGameplayTransport } from "../../../../src/game/online/OnlineGameplayTransport";
import type { OnlineDiffResponseDto, OnlineGameStateSnapshotResponse } from "../../../../src/api/ws/dto/gameplay/onlineGameplayProtocol";
import { createInitialDiff, testGameContent } from "./mockOnlineTestState";

function createMockInitialStateDiff(): OnlineDiffResponseDto {
  const mockSnapshot: OnlineGameStateSnapshotResponse = {
    gameContentVersion: "v1.0",
    gameContent: {
      version: testGameContent.version,
      world: {
        biome: testGameContent.world.biome,
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
            drag: proj.drag,
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
        visual: { fillStyle: "#3b82f6", strokeStyle: "#1d4ed8", accentColor: "#60a5fa", label: "P1" },
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
      {
        entityId: 20,
        playerId: 2,
        displayName: "Player 2",
        tankDefinitionId: "vanguard-cyber",
        width: 24,
        height: 24,
        visual: { fillStyle: "#ef4444", strokeStyle: "#b91c1c", accentColor: "#f87171", label: "P2" },
        position: { x: 1800, y: 388 },
        facing: -1,
        aimAngle: 135,
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
      expectedNextDiffSequence: 2,
      localPlayerId: 1,
      state: mockSnapshot,
    },
  };
}

describe("OnlineGameManager Playback Pipeline", () => {
  it("defers terrain patch, health updates, and turn transition until projectile flight completes", () => {
    let diffListener: (diff: OnlineDiffResponseDto) => void = () => {};
    const mockTransport: OnlineGameplayTransport = {
      sendPlayerIntent: vi.fn(),
      requestResyncState: vi.fn(),
      subscribeToStateDiffs: vi.fn((listener) => {
        diffListener = listener;
        return () => {};
      }),
    };

    let clockMs = 1000;
    const ctx = {
      clock: () => clockMs,
      generateIntentId: () => "intent-1",
      gameContent: testGameContent,
    };

    const manager = createOnlineGameManager({
      transport: mockTransport,
      ctx,
    });

    // 1. Initial State arrives
    diffListener(createMockInitialStateDiff());
    expect(manager.isReady()).toBe(true);

    // Initial camera should be at 0, terrain surface at 400
    const initialState = manager.getState();
    expect(initialState.terrain.surface[1200]).toBe(400);
    expect(initialState.tanks[1]!.health).toBe(100);

    // 2. PROJECTILE_RESOLUTION arrives (seq 2) with flight trajectory to x=1200, y=400
    const projDiff: OnlineDiffResponseDto = {
      gameSessionId: "test-session-123",
      sequence: 2,
      serverTick: 10,
      type: "PROJECTILE_RESOLUTION",
      intentId: "intent-fire-1",
      payload: {
        projectileEntityId: 99,
        ownerPlayerId: 1,
        projectileDefinitionId: "basicShell",
        impact: { x: 1200, y: 400 },
        damagedTanks: [{ entityId: 20, playerId: 2, damageDealt: 30, healthAfter: 70 }],
        trajectory: [
          { x: 200, y: 400 },
          { x: 700, y: 200 },
          { x: 1200, y: 400 },
        ],
      },
    };

    // 3. TERRAIN_PATCH arrives (seq 3) - crater at 1200
    const patchSurface = [...new Array(2400).fill(400)];
    patchSurface[1200] = 450; // crater depth
    const terrainDiff: OnlineDiffResponseDto = {
      gameSessionId: "test-session-123",
      sequence: 3,
      serverTick: 11,
      type: "TERRAIN_PATCH",
      intentId: null,
      payload: {
        patches: [
          {
            kind: "HEIGHTMAP_RANGE",
            startX: 1180,
            surface: new Array(40).fill(450),
          },
        ],
      },
    };

    // 4. TURN_TRANSITION arrives (seq 4) - active player becomes player 2
    const turnDiff: OnlineDiffResponseDto = {
      gameSessionId: "test-session-123",
      sequence: 4,
      serverTick: 12,
      type: "TURN_TRANSITION",
      intentId: null,
      payload: {
        phase: "AIMING",
        activePlayerId: 2,
        turnNumber: 2,
        turnEndsAtServerTick: 900,
        matchEndsAtServerTick: 5400,
        wind: 5,
      },
    };

    // Receive diffs
    diffListener(projDiff);
    diffListener(terrainDiff);
    diffListener(turnDiff);

    // Update midway through flight (dt = 0.2s)
    clockMs += 200;
    manager.update(0.2);

    const midState = manager.getState();
    // Flight is active, so projectile is rendered
    expect(midState.projectiles.length).toBe(1);
    // Terrain patch should NOT be applied yet
    expect(midState.terrain.surface[1200]).toBe(400);
    // Tank health should NOT be reduced yet
    expect(midState.tanks.find((t) => t.playerId === 2)!.health).toBe(100);
    // Turn transition should NOT be applied yet (active player is still 1)
    expect(midState.match.activePlayerId).toBe(1);

    // Advance time until flight completes (dt = 1.0s)
    clockMs += 1000;
    manager.update(1.0);

    const endState = manager.getState();
    // Flight finished
    expect(endState.projectiles.length).toBe(0);
    // Terrain patch is now applied
    expect(endState.terrain.surface[1200]).toBe(450);
    // Tank health is now reduced
    expect(endState.tanks.find((t) => t.playerId === 2)!.health).toBe(70);
    // Floating damage text and explosion particles spawned
    expect(endState.floatingTexts.length).toBeGreaterThan(0);
    expect(endState.particles.length).toBeGreaterThan(0);
    // Turn transition applied (active player is now 2)
    expect(endState.match.activePlayerId).toBe(2);
  });
});
