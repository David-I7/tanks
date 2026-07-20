import assert from "node:assert/strict";

import { createCanvasSizedLocalGameManager, GameEngine } from "../../../src/game";
import type { GameManager, GameState } from "../../../src/game";

type AnimationCallback = (timestamp: number) => void;

function installBrowserRuntime() {
  let animationCallback: AnimationCallback | null = null;

  (globalThis as any).window = {
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
  };
  (globalThis as any).performance = {
    now: () => 0,
  };
  (globalThis as any).requestAnimationFrame = (
    callback: AnimationCallback,
  ): number => {
    animationCallback = callback;
    return 1;
  };
  (globalThis as any).cancelAnimationFrame = () => {};

  return {
    runNextFrame(timestamp = 16): void {
      assert.ok(animationCallback, "expected animation frame to be scheduled");
      const callback = animationCallback;
      animationCallback = null;
      callback(timestamp);
    },
  };
}

function fakeCanvas(size = { width: 960, height: 560 }): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: size.width,
      height: size.height,
    }),
    getContext: () => null,
    addEventListener() {},
    removeEventListener() {},
  } as unknown as HTMLCanvasElement;
}

{
  installBrowserRuntime();
  const canvasSize = { width: 960, height: 560 };
  const canvas = fakeCanvas(canvasSize);
  const manager = createCanvasSizedLocalGameManager({
    canvas,
    mode: "localTwoPlayer",
  });
  const engine = new GameEngine({ canvas, gameManager: manager });
  const before = manager.getState();
  const terrainSize = {
    width: before.terrain.width,
    height: before.terrain.height,
  };
  const tankPositions = before.tanks.map((tank) => tank.position);

  canvasSize.width = 640;
  canvasSize.height = 400;
  engine.resize();

  const after = manager.getState();
  assert.equal(after, before);
  assert.deepEqual(
    { width: after.terrain.width, height: after.terrain.height },
    terrainSize,
  );
  assert.deepEqual(
    after.tanks.map((tank) => tank.position),
    tankPositions,
  );
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 400);

  engine.stop();
}

function gameState(turnNumber: number): GameState {
  return {
    match: {
      mode: "localTwoPlayer",
      activePlayerId: 0,
      phase: "aiming",
      playerCount: 2,
      turnNumber,
      turnTimeRemaining: 30,
      winnerPlayerId: null,
    },
    terrain: {
      kind: "heightmap",
      width: 960,
      height: 560,
      surface: [560, 560],
    },
    projectileDefinitions: {},
    tanks: [],
    projectiles: [],
    impactEvents: [],
  };
}

function fakeGameManager(initialState = gameState(1)): GameManager & {
  readonly submittedActionCount: number;
  readonly updateCount: number;
} {
  let state = initialState;
  let submittedActionCount = 0;
  let updateCount = 0;
  const listeners = new Set<(state: GameState) => void>();

  return {
    get submittedActionCount() {
      return submittedActionCount;
    },
    get updateCount() {
      return updateCount;
    },
    submitAction(): boolean {
      submittedActionCount += 1;
      return true;
    },
    update(): void {
      updateCount += 1;
      state = gameState(state.match.turnNumber + 1);
      for (const listener of listeners) {
        listener(state);
      }
    },
    getState(): GameState {
      return state;
    },
    subscribe(listener): () => void {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy(): void {
      listeners.clear();
    },
  };
}

{
  installBrowserRuntime();
  const manager = createCanvasSizedLocalGameManager({
    canvas: fakeCanvas(),
    mode: "playerVsAi",
  });

  const state = manager.getState();
  assert.equal(state.match.mode, "playerVsAi");
  assert.equal(state.terrain.width, 2400);
  assert.equal(state.terrain.height, 560);

  manager.destroy();
}

{
  installBrowserRuntime();
  const manager = fakeGameManager();
  const engine = new GameEngine({
    canvas: fakeCanvas(),
    gameManager: manager,
  });

  assert.equal(engine.getState().match.turnNumber, 1);

  let immediateTurnNumber: number | null = null;
  engine.subscribe((state) => {
    immediateTurnNumber = state.match.turnNumber;
  })();
  assert.equal(immediateTurnNumber, 1);

  engine.stop();
}

{
  const runtime = installBrowserRuntime();
  const manager = fakeGameManager();
  const engine = new GameEngine({
    canvas: fakeCanvas(),
    gameManager: manager,
  });

  engine.start();
  runtime.runNextFrame();

  assert.equal(manager.updateCount, 1);
  assert.equal(engine.getState().match.turnNumber, 2);

  engine.stop();
}

{
  installBrowserRuntime();
  const manager = fakeGameManager();
  const engine = new GameEngine({
    canvas: fakeCanvas(),
    gameManager: manager,
  });

  assert.equal(
    engine.submitAction({
      type: "move",
      direction: 1,
    }),
    true,
  );
  assert.equal(manager.submittedActionCount, 1);

  engine.stop();
}
