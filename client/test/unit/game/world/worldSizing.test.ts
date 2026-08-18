import { describe, it, expect } from "vitest";
import {
  createCanvasSizing,
  readDomCanvasRect,
  domPointToGameViewportPoint,
} from "../../../../src/game/world/worldSizing";

describe("worldSizing - Viewport Calculation & Large Screen Scrollability", () => {
  const worldWidth = 2400;
  const worldHeight = 768;

  it("ensures gameViewport width is bounded and never exceeds world width on a 1440p monitor", () => {
    const sizing = createCanvasSizing({
      domCanvasRect: { left: 0, top: 0, width: 2560, height: 1440 },
      devicePixelRatio: 1,
      worldWidth,
      worldHeight,
    });

    expect(sizing.gameViewport.width).toBeLessThan(worldWidth);
    // Camera scroll range (maxCameraX) must be strictly positive
    const maxCameraX = worldWidth - sizing.gameViewport.width;
    expect(maxCameraX).toBeGreaterThan(0);
    expect(sizing.dpiViewport.width).toBe(2560);
    expect(sizing.dpiViewport.height).toBe(1440);
  });

  it("ensures gameViewport width is bounded and scrollable on a 4K monitor", () => {
    const sizing = createCanvasSizing({
      domCanvasRect: { left: 0, top: 0, width: 3840, height: 2160 },
      devicePixelRatio: 2,
      worldWidth,
      worldHeight,
    });

    expect(sizing.gameViewport.width).toBeLessThan(worldWidth);
    const maxCameraX = worldWidth - sizing.gameViewport.width;
    expect(maxCameraX).toBeGreaterThan(0);
    expect(sizing.dpiViewport.width).toBe(3840 * 2);
    expect(sizing.dpiViewport.height).toBe(2160 * 2);
  });

  it("ensures gameViewport width is bounded and scrollable on a 21:9 ultrawide monitor", () => {
    const sizing = createCanvasSizing({
      domCanvasRect: { left: 0, top: 0, width: 3440, height: 1440 },
      devicePixelRatio: 1,
      worldWidth,
      worldHeight,
    });

    expect(sizing.gameViewport.width).toBeLessThanOrEqual(worldWidth);
    const maxCameraX = worldWidth - sizing.gameViewport.width;
    expect(maxCameraX).toBeGreaterThan(0);
  });

  it("accurately converts DOM coordinates to game viewport coordinates", () => {
    const gameViewport = { width: 1365, height: 768 };
    const domCanvasRect = { left: 100, top: 50, width: 1920, height: 1080 };

    const point = domPointToGameViewportPoint({
      clientX: 100 + 960, // middle of canvas horizontally
      clientY: 50 + 540,  // middle of canvas vertically
      domCanvasRect,
      gameViewport,
    });

    expect(point.x).toBeCloseTo(1365 / 2, 1);
    expect(point.y).toBeCloseTo(768 / 2, 1);
  });

  it("reads DOM canvas rect safely without silent hardcoded fallbacks", () => {
    const mockCanvas = {
      width: 1280,
      height: 720,
      getBoundingClientRect: () => ({
        left: 10,
        top: 20,
        width: 1280,
        height: 720,
      }),
    } as unknown as HTMLCanvasElement;

    const rect = readDomCanvasRect(mockCanvas);
    expect(rect).toEqual({
      left: 10,
      top: 20,
      width: 1280,
      height: 720,
    });
  });
});
