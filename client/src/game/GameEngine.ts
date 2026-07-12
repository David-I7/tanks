import {
  CanvasInputSource,
  type CanvasInputLayout,
} from "./input/CanvasInputSource";
import {
  CanvasGameRenderer,
  type RendererAssets,
} from "./rendering/CanvasGameRenderer";
import type { GameAction, GameViewState } from "./types";
import { type GameManager } from "./authority/gameAuthority";
import {
  createCanvasSizing,
  readDomCanvasRect,
  type CanvasSizing,
} from "./world/worldSizing";

export type GameEngineOptions = {
  canvas: HTMLCanvasElement;
  gameManager: GameManager;
  rendererAssets?: RendererAssets;
};

export class GameEngine {
  private readonly renderer: CanvasGameRenderer;
  private readonly localInput: CanvasInputSource;
  private readonly gameManager: GameManager;
  private readonly viewStateListeners = new Set<
    (viewState: GameViewState) => void
  >();
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private latestViewState: GameViewState;
  private sizing: CanvasSizing;
  private inputLayout: CanvasInputLayout;
  private readonly unsubscribeGameManager: () => void;

  constructor(private readonly options: GameEngineOptions) {
    this.gameManager = options.gameManager;
    this.latestViewState = this.gameManager.getState() as GameViewState;

    const initialLayout = this.measureCanvasLayout();
    this.sizing = initialLayout.sizing;
    this.inputLayout = initialLayout.inputLayout;
    this.applyCanvasSizing();
    this.renderer = new CanvasGameRenderer(
      options.canvas,
      options.rendererAssets ?? {},
      this.sizing.gameViewport,
      this.sizing.dpiViewport,
    );
    this.localInput = new CanvasInputSource(options.canvas, this.inputLayout);

    this.unsubscribeGameManager = this.gameManager.subscribe((state) => {
      this.publishViewState(state as GameViewState);
    });
  }

  start(): void {
    if (this.animationFrameId !== null) return;
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.localInput.destroy();
    this.unsubscribeGameManager();
    this.gameManager.destroy();
  }

  resize(): CanvasSizing {
    const layout = this.measureCanvasLayout();
    this.sizing = layout.sizing;
    this.inputLayout = layout.inputLayout;
    this.applyCanvasSizing();
    this.renderer?.setSizing(
      this.sizing.gameViewport,
      this.sizing.dpiViewport,
    );
    this.localInput?.setLayout(this.inputLayout);
    return this.sizing;
  }

  submitAction(action: GameAction): boolean {
    const accepted = this.gameManager.submitAction(action);
    this.publishViewState(this.gameManager.getState() as GameViewState);
    return accepted;
  }

  getViewState(): GameViewState {
    this.latestViewState = this.gameManager.getState() as GameViewState;
    return this.latestViewState;
  }

  subscribe(listener: (viewState: GameViewState) => void): () => void {
    this.viewStateListeners.add(listener);
    listener(this.getViewState());
    return () => {
      this.viewStateListeners.delete(listener);
    };
  }

  private readonly tick = (timestamp: number) => {
    const dt = Math.min(
      0.033,
      (timestamp - this.lastTimestamp) / 1000 || 0.016,
    );
    this.lastTimestamp = timestamp;

    this.update(dt);

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    const viewStateBeforeInput = this.gameManager.getState() as GameViewState;

    this.submitActions(
      this.localInput.poll(this.renderer.getCameraX(), viewStateBeforeInput),
    );

    this.gameManager.update(dt);
    const viewState = this.gameManager.getState() as GameViewState;
    this.renderer.render(viewState);
    this.publishViewState(viewState);
  }

  private submitActions(actions: GameAction[]): void {
    for (const action of actions) {
      this.gameManager.submitAction(action);
    }
  }

  private publishViewState(viewState: GameViewState): void {
    this.latestViewState = viewState;
    for (const listener of this.viewStateListeners) {
      listener(viewState);
    }
  }

  private measureCanvasLayout(): {
    sizing: CanvasSizing;
    inputLayout: CanvasInputLayout;
  } {
    const domCanvasRect = readDomCanvasRect(this.options.canvas);
    const sizing = createCanvasSizing({
      domCanvasRect,
      devicePixelRatio: window.devicePixelRatio || 1,
    });

    return {
      sizing,
      inputLayout: {
        gameViewport: sizing.gameViewport,
        domCanvasRect: sizing.domCanvasRect,
      },
    };
  }

  private applyCanvasSizing(): void {
    this.options.canvas.width = this.sizing.dpiViewport.width;
    this.options.canvas.height = this.sizing.dpiViewport.height;
  }
}
