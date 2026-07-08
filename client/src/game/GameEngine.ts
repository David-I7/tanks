import { type RemoteGameTransport } from "./authority/RemoteSimulationAuthority";
import { AiIntentSource } from "./input/AiIntentSource";
import {
  CanvasInputSource,
  type CanvasInputLayout,
} from "./input/CanvasInputSource";
import {
  CanvasGameRenderer,
  type RendererAssets,
} from "./rendering/CanvasGameRenderer";
import { getLocalControllerKind } from "./modes";
import { createDefaultMatchSetup } from "./world/createInitialWorld";
import type { GameMode, GameSnapshot, MatchSetup, PlayerIntent } from "./types";
import { mockGameContent, type GameContent } from "./content/mockGameContent";
import {
  createLocalSimulationAuthority,
  createRemoteSimulationAuthority,
  type SimulationAuthority,
} from "./authority/simulationAuthority";
import {
  createWorldSizingPolicy,
  type WorldSizing,
} from "./world/worldSizing";

export type GameEngineOptions = {
  canvas: HTMLCanvasElement;
  mode: GameMode;
  matchSetup?: MatchSetup;
  content?: GameContent;
  remoteTransport?: RemoteGameTransport;
  rendererAssets?: RendererAssets;
};

export class GameEngine {
  private readonly renderer: CanvasGameRenderer;
  private readonly localInput: CanvasInputSource;
  private readonly aiInput = new AiIntentSource();
  private readonly authority: SimulationAuthority;
  private readonly snapshotListeners = new Set<
    (snapshot: GameSnapshot) => void
  >();
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private latestSnapshot: GameSnapshot | null = null;
  private sizing: WorldSizing;
  private inputLayout: CanvasInputLayout;
  private readonly unsubscribeAuthority: () => void;

  constructor(private readonly options: GameEngineOptions) {
    const initialLayout = this.measureCanvasLayout();
    this.sizing = initialLayout.sizing;
    this.inputLayout = initialLayout.inputLayout;
    this.applyCanvasSizing();
    this.renderer = new CanvasGameRenderer(
      options.canvas,
      options.rendererAssets ?? {},
      this.sizing.viewport,
    );
    this.localInput = new CanvasInputSource(options.canvas, this.inputLayout);

    if (options.mode === "online" && options.remoteTransport) {
      this.authority = createRemoteSimulationAuthority(options.remoteTransport);
    } else {
      const setup = options.matchSetup ?? createDefaultMatchSetup(options.mode);
      const content = options.content ?? mockGameContent;
      this.authority = createLocalSimulationAuthority({
        mode: options.mode,
        setup,
        content,
        worldSize: this.sizing.world,
      });
    }

    this.unsubscribeAuthority = this.authority.subscribe((snapshot) => {
      this.publishSnapshot(snapshot);
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
    this.unsubscribeAuthority();
    this.authority.destroy();
  }

  resize(): WorldSizing {
    const layout = this.measureCanvasLayout();
    this.sizing = layout.sizing;
    this.inputLayout = layout.inputLayout;
    this.applyCanvasSizing();
    this.renderer?.setViewport(this.sizing.viewport);
    this.localInput?.setLayout(this.inputLayout);
    return this.sizing;
  }

  submitIntent(playerId: number, intent: PlayerIntent): boolean {
    const accepted = this.authority.submitIntent(playerId, intent);
    const snapshot = this.authority.snapshot();
    if (snapshot) this.publishSnapshot(snapshot);
    return accepted;
  }

  getSnapshot(): GameSnapshot | null {
    this.latestSnapshot = this.authority.snapshot();
    return this.latestSnapshot;
  }

  subscribe(listener: (snapshot: GameSnapshot) => void): () => void {
    this.snapshotListeners.add(listener);
    const snapshot = this.getSnapshot();
    if (snapshot) listener(snapshot);
    return () => {
      this.snapshotListeners.delete(listener);
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
    const snapshotBeforeInput = this.authority.snapshot();
    if (!snapshotBeforeInput) {
      this.authority.update(dt);
      return;
    }
    const activePlayerId = snapshotBeforeInput.match.activePlayerId;
    const controllerKind = getLocalControllerKind(
      this.options.mode,
      activePlayerId,
    );

    if (controllerKind === "human") {
      this.submitIntents(
        activePlayerId,
        this.localInput.poll(this.renderer.getCameraX(), snapshotBeforeInput),
      );
    }

    if (controllerKind === "ai") {
      this.submitIntents(
        activePlayerId,
        this.aiInput.poll(snapshotBeforeInput, activePlayerId, dt),
      );
    }

    this.authority.update(dt);
    const snapshot = this.authority.snapshot();
    if (snapshot) {
      this.renderer.render(snapshot);
      this.publishSnapshot(snapshot);
    }
  }

  private submitIntents(playerId: number, intents: PlayerIntent[]): void {
    for (const intent of intents) {
      this.authority.submitIntent(playerId, intent);
    }
  }

  private publishSnapshot(snapshot: GameSnapshot): void {
    this.latestSnapshot = snapshot;
    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
  }

  private measureCanvasLayout(): {
    sizing: WorldSizing;
    inputLayout: CanvasInputLayout;
  } {
    const rect = this.options.canvas.getBoundingClientRect();
    const sizing = createWorldSizingPolicy({
      viewport: { width: rect.width, height: rect.height },
      devicePixelRatio: window.devicePixelRatio || 1,
    });

    return {
      sizing,
      inputLayout: {
        viewport: sizing.viewport,
        canvasRect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      },
    };
  }

  private applyCanvasSizing(): void {
    this.options.canvas.width = this.sizing.backing.width;
    this.options.canvas.height = this.sizing.backing.height;
  }
}
