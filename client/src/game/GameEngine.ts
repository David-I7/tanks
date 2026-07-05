import {
  RemoteSimulationAuthority,
  type RemoteGameTransport,
} from "./authority/RemoteSimulationAuthority";
import { AiIntentSource } from "./input/AiIntentSource";
import { CanvasInputSource } from "./input/CanvasInputSource";
import { CanvasGameRenderer } from "./rendering/CanvasGameRenderer";
import { getLocalControllerKind } from "./modes";
import { createInitialWorld } from "./simulation/createInitialWorld";
import { LocalSimulationAuthority } from "./simulation/LocalSimulationAuthority";
import type { GameMode, PlayerIntent } from "./types";

export type GameEngineOptions = {
  canvas: HTMLCanvasElement;
  mode: GameMode;
  tankImageUrl?: string;
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
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private tankImage?: HTMLImageElement;

  constructor(private readonly options: GameEngineOptions) {
    this.resize();
    this.tankImage = this.loadTankImage(options.tankImageUrl);
    this.renderer = new CanvasGameRenderer(options.canvas, {
      tankImage: this.tankImage,
    });
    this.localInput = new CanvasInputSource(options.canvas);

    if (options.mode === "online" && options.remoteTransport) {
      this.authority = {
        kind: "remote",
        authority: new RemoteSimulationAuthority(options.remoteTransport),
      };
    } else {
      const { world, terrain } = createInitialWorld(
        options.mode,
        options.canvas.width,
        options.canvas.height,
      );
      this.authority = {
        kind: "local",
        authority: new LocalSimulationAuthority(world, terrain),
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
    this.renderer.render(authority.snapshot());
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
        authority.submitIntent(intent);
      }
      this.renderer.render(snapshot);
    }
  }

  private submitIntents(playerId: number, intents: PlayerIntent[]): void {
    if (this.authority.kind !== "local") return;
    for (const intent of intents) {
      this.authority.authority.submitIntent(playerId, intent);
    }
  }

  private loadTankImage(url: string | undefined): HTMLImageElement | undefined {
    if (!url) return undefined;
    const image = new Image();
    image.src = url;
    return image;
  }
}
