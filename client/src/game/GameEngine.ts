import {
  RemoteSimulationAuthority,
  type RemoteGameTransport,
} from "./authority/RemoteSimulationAuthority";
import { AiIntentSource } from "./input/AiIntentSource";
import { CanvasInputSource } from "./input/CanvasInputSource";
import { CanvasGameRenderer } from "./rendering/CanvasGameRenderer";
import { getLocalControllerKind } from "./modes";
import {
  createDefaultMatchSetup,
  createInitialWorld,
} from "./simulation/createInitialWorld";
import { LocalSimulationAuthority } from "./simulation/LocalSimulationAuthority";
import type {
  GameMode,
  GameSnapshot,
  MatchSetup,
  PlayerIntent,
} from "./types";
import { mockGameContent, type GameContent } from "./content/mockGameContent";

export type GameEngineOptions = {
  canvas: HTMLCanvasElement;
  mode: GameMode;
  matchSetup?: MatchSetup;
  content?: GameContent;
  remoteTransport?: RemoteGameTransport;
};

type Authority =
  | { kind: "local"; authority: LocalSimulationAuthority }
  | { kind: "remote"; authority: RemoteSimulationAuthority };

export class GameEngine {
  private readonly renderer: CanvasGameRenderer;
  private readonly localInput: CanvasInputSource;
  private readonly aiInput = new AiIntentSource();
  private readonly authority: Authority;
  private readonly snapshotListeners = new Set<(snapshot: GameSnapshot) => void>();
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private latestSnapshot: GameSnapshot | null = null;

  constructor(private readonly options: GameEngineOptions) {
    this.resize();
    this.renderer = new CanvasGameRenderer(options.canvas, {});
    this.localInput = new CanvasInputSource(options.canvas);

    if (options.mode === "online" && options.remoteTransport) {
      this.authority = {
        kind: "remote",
        authority: new RemoteSimulationAuthority(options.remoteTransport),
      };
    } else {
      const setup = options.matchSetup ?? createDefaultMatchSetup(options.mode);
      const content = options.content ?? mockGameContent;
      const { world, terrain } = createInitialWorld(
        setup,
        content,
        options.canvas.width,
        options.canvas.height,
      );
      this.authority = {
        kind: "local",
        authority: new LocalSimulationAuthority(world, terrain, content),
      };
    }
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
    if (this.authority.kind === "remote") {
      this.authority.authority.destroy();
    }
  }

  resize(): void {
    const rect = this.options.canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    this.options.canvas.width = Math.max(320, Math.floor(rect.width * scale));
    this.options.canvas.height = Math.max(240, Math.floor(rect.height * scale));
  }

  submitIntent(playerId: number, intent: PlayerIntent): boolean {
    if (this.authority.kind === "local") {
      const accepted = this.authority.authority.submitIntent(playerId, intent);
      this.publishSnapshot(this.authority.authority.snapshot());
      return accepted;
    }

    return this.authority.authority.submitIntent({ playerId, intent });
  }

  getSnapshot(): GameSnapshot | null {
    if (this.authority.kind === "local") {
      this.latestSnapshot = this.authority.authority.snapshot();
    }
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

    if (this.authority.kind === "local") {
      this.updateLocal(dt);
    } else {
      this.updateRemote();
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private updateLocal(dt: number): void {
    if (this.authority.kind !== "local") return;
    const authority = this.authority.authority;
    const snapshotBeforeInput = authority.snapshot();
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

    authority.update(dt);
    const snapshot = authority.snapshot();
    this.renderer.render(snapshot);
    this.publishSnapshot(snapshot);
  }

  private updateRemote(): void {
    if (this.authority.kind !== "remote") return;
    const authority = this.authority.authority;
    const snapshot = authority.snapshot();
    if (snapshot) {
      for (const intent of this.localInput.poll(
        this.renderer.getCameraX(),
        snapshot,
      )) {
        authority.submitIntent({
          playerId: snapshot.match.activePlayerId,
          intent,
        });
      }
      this.renderer.render(snapshot);
      this.publishSnapshot(snapshot);
    }
  }

  private submitIntents(playerId: number, intents: PlayerIntent[]): void {
    if (this.authority.kind !== "local") return;
    for (const intent of intents) {
      this.authority.authority.submitIntent(playerId, intent);
    }
  }

  private publishSnapshot(snapshot: GameSnapshot): void {
    this.latestSnapshot = snapshot;
    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
  }
}
