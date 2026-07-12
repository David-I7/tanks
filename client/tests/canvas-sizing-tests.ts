import assert from "node:assert/strict";

import { CanvasGameRenderer } from "../src/game/rendering/CanvasGameRenderer";
import {
  createCanvasSizing,
  domPointToGameViewportPoint,
} from "../src/game/world/worldSizing";
import type { GameViewState } from "../src/game/types";

function viewState(): GameViewState {
  return {
    match: {
      mode: "localTwoPlayer",
      phase: "aiming",
      activePlayerId: 0,
      playerCount: 2,
      turnNumber: 1,
      turnTimeRemaining: 30,
      winnerPlayerId: null,
    },
    terrain: {
      kind: "heightmap",
      width: 1000,
      height: 500,
      surface: [],
    },
    projectileDefinitions: {},
    tanks: [],
    projectiles: [],
    impactEvents: [],
  };
}

function recordingContext() {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const gradient = { addColorStop() {} };
  const proxy = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "createLinearGradient") {
          return (...args: unknown[]) => {
            calls.push({ name: "createLinearGradient", args });
            return gradient;
          };
        }
        if (property === "measureText") {
          return () => ({ width: 0 });
        }
        return (...args: unknown[]) => {
          calls.push({ name: String(property), args });
        };
      },
      set() {
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;

  return { ctx: proxy, calls };
}

function fakeCanvas(ctx: CanvasRenderingContext2D): HTMLCanvasElement {
  return {
    width: 1000,
    height: 500,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

{
  const sizing = createCanvasSizing({
    domCanvasRect: { left: 12, top: 24, width: 960.8, height: 560.4 },
    devicePixelRatio: 2,
  });

  assert.deepEqual(sizing.gameViewport, { width: 960, height: 560 });
  assert.deepEqual(sizing.dpiViewport, { width: 1920, height: 1120 });
  assert.equal("worldSize" in sizing, false);
  assert.deepEqual(sizing.domCanvasRect, {
    left: 12,
    top: 24,
    width: 960.8,
    height: 560.4,
  });
}

{
  const sizing = createCanvasSizing({
    domCanvasRect: { left: 0, top: 0, width: 12, height: 18 },
    devicePixelRatio: 0,
  });

  assert.deepEqual(sizing.gameViewport, { width: 320, height: 240 });
  assert.deepEqual(sizing.dpiViewport, { width: 320, height: 240 });
}

{
  assert.deepEqual(
    domPointToGameViewportPoint({
      clientX: 300,
      clientY: 150,
      domCanvasRect: { left: 100, top: 50, width: 400, height: 200 },
      gameViewport: { width: 800, height: 400 },
    }),
    { x: 400, y: 200 },
  );
}

{
  const { ctx, calls } = recordingContext();
  const canvas = fakeCanvas(ctx);
  const renderer = new CanvasGameRenderer(
    canvas,
    {},
    { width: 500, height: 250 },
    { width: 1000, height: 500 },
  );

  renderer.render(viewState());
  assert.deepEqual(
    calls.find((call) => call.name === "setTransform")?.args,
    [2, 0, 0, 2, 0, 0],
  );
  assert.deepEqual(
    calls.find((call) => call.name === "clearRect")?.args,
    [0, 0, 500, 250],
  );

  calls.length = 0;
  renderer.setSizing(
    { width: 400, height: 200 },
    { width: 1200, height: 600 },
  );
  renderer.render(viewState());

  assert.deepEqual(
    calls.find((call) => call.name === "setTransform")?.args,
    [3, 0, 0, 3, 0, 0],
  );
  assert.deepEqual(renderer.getGameViewport(), { width: 400, height: 200 });
}
