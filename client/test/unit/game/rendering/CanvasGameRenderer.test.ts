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
        label: "BS",
        radius: 4,
        baseVelocity: 1.0,
        gravityScale: 1.0,
        drag: 0,
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
        width: 36,
        height: 24,
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
        position: { x: 200, y: 388 },
        visual: {
          fill: "#22c55e",
          stroke: "#16a34a",
          accent: "#4ade80",
          label: "P1",
        },
      },
      {
        entityId: 2,
        playerId: 1,
        displayName: "Player 2",
        controllerKind: "remote",
        tankDefinitionId: "desert-striker",
        tankName: "Desert Striker",
        width: 36,
        height: 24,
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
        position: { x: 800, y: 388 },
        visual: {
          fill: "#ef4444",
          stroke: "#dc2626",
          accent: "#f87171",
          label: "P2",
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
    expect(textCalls.some((t) => t.includes("BS"))).toBe(true);
    expect(textCalls.some((t) => t.includes("POWER"))).toBe(true);
    expect(textCalls.some((t) => t.includes("ANGLE"))).toBe(true);
  });

  it("suppresses weapon selector, FIRE button, and power/angle overlay for active remote opponent in online mode", () => {
    const { canvas, ctx } = createMockCanvasContext();
    const renderer = new CanvasGameRenderer(
      canvas,
      { width: 1280, height: 720 },
      { width: 1280, height: 720 },
    );

    const state = createTestGameState({ activeControllerKind: "remote" });
    renderer.render(state);

    const textCalls = ctx.getFillTextCalls();
    expect(textCalls.some((t) => t.includes("FIRE"))).toBe(false);
    expect(textCalls.some((t) => t.includes("WAIT"))).toBe(false);
    expect(textCalls.some((t) => t.includes("POWER"))).toBe(false);
    expect(textCalls.some((t) => t.includes("ANGLE"))).toBe(false);
  });
});
