import { describe, it, expect, vi } from "vitest";
import { CanvasGameRenderer } from "../../../../src/game/rendering/CanvasGameRenderer";
import type { GameState } from "../../../../src/game/types";

function createTestGameState(options?: {
  activeControllerKind?: "human" | "remote";
  destroyedDecors?: boolean;
}): GameState {
  return {
    match: {
      mode: "online",
      phase: "thinking",
      activePlayerId: 0,
      playerCount: 2,
      turnNumber: 1,
      turnTimeRemaining: 30,
      matchTimeRemaining: 180,
      wind: 0,
      winnerPlayerId: null,
      biome: "forest",
      isCameraLocked: true,
      cameraX: 0,
    },
    terrain: {
      kind: "heightmap",
      width: 1280,
      height: 720,
      surface: new Array(1280).fill(400),
    },
    projectileDefinitions: {
      basicShell: {
        id: "basicShell",
        name: "Basic Shell",
        visual: {
          radius: 4,
          fill: "#475569",
          stroke: "#38bdf8",
          accent: "#f59e0b",
        },
        baseVelocity: 1.0,
        gravityScale: 1.0,
        terrainEffectType: "CRATER",
        terrainRadius: 24,
        terrainDepth: 20,
        damageEffectType: "RADIAL",
        damageRadius: 36,
        damage: 40,
        subMunitions: null,
        damageTrail: null,
      },
    },
    tanks: [
      {
        entityId: 1,
        playerId: 0,
        displayName: "Player 1",
        controllerKind: options?.activeControllerKind ?? "human",
        tankDefinitionId: "heavy-armor",
        tankName: "Heavy Armor",
        width: 44,
        height: 28,
        loadout: ["basicShell"],
        selectedProjectileSlotId: "basicShell",
        weaponAmmo: { basicShell: -1 },
        maxHealth: 100,
        health: 100,
        facing: 1,
        bodyAngle: 0,
        aimAngle: -Math.PI / 4,
        power: 360,
        maxFuel: 240,
        fuel: 240,
        alive: true,
        position: { x: 200, y: 386 },
        visual: {
          fill: "#22c55e",
          stroke: "#16a34a",
          accent: "#4ade80",
        },
      },
      {
        entityId: 2,
        playerId: 1,
        displayName: "Player 2",
        controllerKind: "remote",
        tankDefinitionId: "desert-striker",
        tankName: "Desert Striker",
        width: 44,
        height: 28,
        loadout: ["basicShell"],
        selectedProjectileSlotId: "basicShell",
        weaponAmmo: { basicShell: -1 },
        maxHealth: 100,
        health: 100,
        facing: -1,
        bodyAngle: 0,
        aimAngle: -Math.PI * 0.75,
        power: 360,
        maxFuel: 240,
        fuel: 240,
        alive: true,
        position: { x: 800, y: 386 },
        visual: {
          fill: "#ef4444",
          stroke: "#dc2626",
          accent: "#f87171",
        },
      },
    ],
    projectiles: [],
    impactEvents: [],
    damageTrails: [],
    lootCrates: [],
    particles: [],
    floatingTexts: [],
    decors: options?.destroyedDecors
      ? [
          {
            id: "dec-1",
            type: "tree",
            x: 200,
            y: 400,
            scale: 1,
            rotation: 0,
            destroyed: true,
          },
          {
            id: "dec-2",
            type: "rock",
            x: 400,
            y: 400,
            scale: 1,
            rotation: 0,
            destroyed: false,
          },
        ]
      : [],
    clouds: [],
  };
}

describe("CanvasGameRenderer", () => {
  function createMockCanvasContext() {
    let saveCount = 0;
    let restoreCount = 0;
    const fillTextCalls: string[] = [];

    const ctx = {
      save: vi.fn(() => {
        saveCount++;
      }),
      restore: vi.fn(() => {
        restoreCount++;
      }),
      scale: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      roundRect: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillText: vi.fn((text: string) => {
        fillTextCalls.push(text);
      }),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      getSaveCount: () => saveCount,
      getRestoreCount: () => restoreCount,
      getFillTextCalls: () => fillTextCalls,
    };

    const canvas = {
      getContext: vi.fn(() => ctx),
    } as unknown as HTMLCanvasElement;

    return { canvas, ctx };
  }

  it("maintains strict 1:1 canvas context save and restore balance even when decors are destroyed", () => {
    const { canvas, ctx } = createMockCanvasContext();
    const renderer = new CanvasGameRenderer(
      canvas,
      { width: 1280, height: 720 },
      { width: 1280, height: 720 },
    );

    const state = createTestGameState({ destroyedDecors: true });
    renderer.render(state);

    expect(ctx.getSaveCount()).toBeGreaterThan(0);
    expect(ctx.getSaveCount()).toBe(ctx.getRestoreCount());
  });

  it("renders weapon selector and FIRE button for active human tank", () => {
    const { canvas, ctx } = createMockCanvasContext();
    const renderer = new CanvasGameRenderer(
      canvas,
      { width: 1280, height: 720 },
      { width: 1280, height: 720 },
    );

    const state = createTestGameState({ activeControllerKind: "human" });
    renderer.render(state);

    const textCalls = ctx.getFillTextCalls();
    expect(textCalls.some((t) => t.includes("FIRE"))).toBe(true);
    expect(textCalls.some((t) => t.includes("Basic Shell"))).toBe(true);
    expect(textCalls.some((t) => t.includes("POWER"))).toBe(true);
    expect(textCalls.some((t) => t.includes("ANGLE"))).toBe(true);
  });

  it("renders elemental tanks (ignis, glacies, terra, volt) with strict context balance", () => {
    const { canvas, ctx } = createMockCanvasContext();
    const renderer = new CanvasGameRenderer(
      canvas,
      { width: 1280, height: 720 },
      { width: 1280, height: 720 },
    );

    const elementalTanks: Array<"ignis" | "glacies" | "terra" | "volt"> = [
      "ignis",
      "glacies",
      "terra",
      "volt",
    ];

    for (const tankId of elementalTanks) {
      const state = createTestGameState();
      state.tanks[0]!.tankDefinitionId = tankId;
      renderer.render(state);
      expect(ctx.getSaveCount()).toBeGreaterThan(0);
      expect(ctx.getSaveCount()).toBe(ctx.getRestoreCount());
    }
  });

  it("renders typed environmental hazard vignettes (FIRE, FROST, QUAKE, ELECTRIC) without unbalanced context state", () => {
    const { canvas, ctx } = createMockCanvasContext();
    const renderer = new CanvasGameRenderer(
      canvas,
      { width: 1280, height: 720 },
      { width: 1280, height: 720 },
    );

    const hazardTypes: Array<"FIRE" | "FROST" | "QUAKE" | "ELECTRIC"> = [
      "FIRE",
      "FROST",
      "QUAKE",
      "ELECTRIC",
    ];

    for (const hazardType of hazardTypes) {
      const state = createTestGameState();
      state.damageTrails = [
        {
          id: `trail-${hazardType}`,
          position: { x: 200, y: 386 },
          radius: 50,
          damagePerSecond: 10,
          remainingDuration: 4.0,
          ownerPlayerId: 1,
          hazardType,
        },
      ];
      renderer.render(state);
      expect(ctx.createRadialGradient).toHaveBeenCalled();
      expect(ctx.getSaveCount()).toBe(ctx.getRestoreCount());
    }
  });
});

