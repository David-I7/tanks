import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameEngine } from "../../../src/game/GameEngine";
import type { GameManager } from "../../../src/game/authority/gameManager";
import type { GameState } from "../../../src/game/types";

function createMockGameState(): GameState {
  return {
    match: {
      mode: "localTwoPlayer",
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
    terrain: { kind: "heightmap", width: 1280, height: 720, surface: new Array(1280).fill(400) },
    tanks: [],
    projectiles: [],
    projectileDefinitions: {},
    impactEvents: [],
    damageTrails: [],
    lootCrates: [],
    particles: [],
    floatingTexts: [],
    decors: [],
    clouds: [],
  };
}

describe("GameEngine Fixed-Timestep Accumulator", () => {
  let rafCallbacks: Array<(timestamp: number) => void> = [];
  let rafId = 0;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: (timestamp: number) => void) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.stubGlobal("window", {
      devicePixelRatio: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates simulation in fixed 60 Hz steps on a 144 Hz display", () => {
    const mockState = createMockGameState();
    const updateCalls: number[] = [];

    const mockManager: GameManager = {
      submitAction: vi.fn(() => true),
      update: vi.fn((dt: number) => {
        updateCalls.push(dt);
      }),
      getState: vi.fn(() => mockState),
      subscribe: vi.fn((cb) => {
        cb(mockState);
        return () => {};
      }),
      destroy: vi.fn(),
    };

    // Create a mock canvas
    const canvas = {
      width: 1280,
      height: 720,
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 1280,
        height: 720,
      }),
      getContext: vi.fn(() => ({
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        roundRect: vi.fn(),
      })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement;

    let currentTimestamp = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => currentTimestamp);

    const engine = new GameEngine({ canvas, gameManager: mockManager });
    engine.start();

    // Simulate 144 Hz frame intervals (~6.94ms per frame)
    const frameIntervalMs = 1000 / 144; // ~6.944ms

    // Run 144 frames (1 second of display time)
    for (let frame = 0; frame < 144; frame++) {
      currentTimestamp += frameIntervalMs;
      const callback = rafCallbacks.shift();
      if (callback) callback(currentTimestamp);
    }

    // Over 1 second on a 144 Hz display, exactly ~60 simulation updates should run
    expect(updateCalls.length).toBeGreaterThanOrEqual(58);
    expect(updateCalls.length).toBeLessThanOrEqual(62);

    // Every update call must receive the exact fixed timestep (1/60s)
    for (const dt of updateCalls) {
      expect(dt).toBeCloseTo(1 / 60);
    }

    engine.stop();
  });
});
