import type { GameState } from "../types";
import { simulateTrajectoryPreview } from "../simulation/ballistics";
import { getProjectileSelectorLayout } from "../input/inputHelpers";
import type { DpiViewport, GameViewport } from "../world/worldSizing";

export type RendererAssets = {
  tankImage?: HTMLImageElement;
  tankImages?: Record<string, HTMLImageElement>;
};

type RenderContext = {
  gameViewport: GameViewport;
  cameraX: number;
  assets: RendererAssets;
};

type RenderPass = {
  name: string;
  draw(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    context: RenderContext,
  ): void;
};

export class CanvasGameRenderer {
  private cameraX = 0;
  private gameViewport: GameViewport;
  private dpiViewport: DpiViewport;
  private readonly worldPasses: RenderPass[];
  private readonly overlayPasses: RenderPass[];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly assets: RendererAssets,
    gameViewport?: GameViewport,
    dpiViewport?: DpiViewport,
  ) {
    this.gameViewport = gameViewport ?? {
      width: canvas.width,
      height: canvas.height,
    };
    this.dpiViewport = dpiViewport ?? {
      width: canvas.width,
      height: canvas.height,
    };
    this.worldPasses = [
      {
        name: "terrain",
        draw: (ctx, gameState) => this.drawTerrain(ctx, gameState),
      },
      {
        name: "trajectoryPreview",
        draw: (ctx, gameState) => this.drawTrajectoryPreview(ctx, gameState),
      },
      {
        name: "impactEvents",
        draw: (ctx, gameState) => this.drawImpactEvents(ctx, gameState),
      },
      {
        name: "projectiles",
        draw: (ctx, gameState) => this.drawProjectiles(ctx, gameState),
      },
      {
        name: "tanks",
        draw: (ctx, gameState) => this.drawTanks(ctx, gameState),
      },
    ];
    this.overlayPasses = [
      { name: "hud", draw: (ctx, gameState) => this.drawHud(ctx, gameState) },
    ];
  }

  setSizing(gameViewport: GameViewport, dpiViewport: DpiViewport): void {
    this.gameViewport = gameViewport;
    this.dpiViewport = dpiViewport;
  }

  getGameViewport(): GameViewport {
    return this.gameViewport;
  }

  getCameraX(): number {
    return this.cameraX;
  }

  render(gameState: GameState): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    this.updateCamera(gameState);

    ctx.setTransform(
      this.dpiViewport.width / this.gameViewport.width,
      0,
      0,
      this.dpiViewport.height / this.gameViewport.height,
      0,
      0,
    );
    ctx.clearRect(0, 0, this.gameViewport.width, this.gameViewport.height);
    this.drawSky(ctx);

    const renderContext = {
      gameViewport: this.gameViewport,
      cameraX: this.cameraX,
      assets: this.assets,
    };

    ctx.save();
    ctx.translate(-this.cameraX, 0);
    for (const pass of this.worldPasses) {
      pass.draw(ctx, gameState, renderContext);
    }
    ctx.restore();

    for (const pass of this.overlayPasses) {
      pass.draw(ctx, gameState, renderContext);
    }
  }

  private updateCamera(gameState: GameState): void {
    const activeTank = gameState.tanks.find(
      (entry) => entry.playerId === gameState.match.activePlayerId,
    );
    const focusX =
      gameState.projectiles[0]?.position.x ??
      activeTank?.position.x ??
      this.gameViewport.width / 2;
    const maxCameraX = Math.max(
      0,
      gameState.terrain.width - this.gameViewport.width,
    );
    const targetCameraX = Math.max(
      0,
      Math.min(maxCameraX, focusX - this.gameViewport.width * 0.5),
    );
    this.cameraX += (targetCameraX - this.cameraX) * 0.12;
  }

  private drawSky(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(
      0,
      0,
      0,
      this.gameViewport.height,
    );
    gradient.addColorStop(0, "#101827");
    gradient.addColorStop(0.58, "#26374a");
    gradient.addColorStop(1, "#0b0c10");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.gameViewport.width, this.gameViewport.height);
  }

  private drawTerrain(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (gameState.terrain.kind !== "heightmap") return;

    ctx.beginPath();
    ctx.moveTo(0, this.gameViewport.height + 80);
    for (let x = 0; x < gameState.terrain.width; x += 1) {
      ctx.lineTo(x, gameState.terrain.surface[x] ?? this.gameViewport.height);
    }
    ctx.lineTo(gameState.terrain.width, this.gameViewport.height + 80);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(
      0,
      this.gameViewport.height * 0.5,
      0,
      this.gameViewport.height,
    );
    gradient.addColorStop(0, "#47724a");
    gradient.addColorStop(1, "#1d3221");
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private drawTanks(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    for (const entry of gameState.tanks) {
      if (!entry.alive) continue;

      ctx.save();
      ctx.translate(entry.position.x, entry.position.y);
      ctx.rotate(entry.bodyAngle);

      const renderAssetId = "renderAssetId" in entry ? (entry as any).renderAssetId : undefined;
      const image =
        this.assets.tankImages?.[entry.tankDefinitionId] ||
        (renderAssetId ? this.assets.tankImages?.[renderAssetId] : undefined) ||
        this.assets.tankImage;

      if (image?.complete) {
        ctx.scale(entry.facing, 1);
        ctx.drawImage(image, -24, -30, 48, 28);
      } else {
        ctx.fillStyle = entry.visual.fill;
        ctx.strokeStyle = entry.visual.stroke;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-25, -27, 50, 24, 7);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = entry.visual.accent;
        ctx.beginPath();
        ctx.arc(0, -28, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      const turretX = entry.position.x;
      const turretY = entry.position.y - 22;
      ctx.strokeStyle =
        entry.playerId === gameState.match.activePlayerId
          ? "#ebc80e"
          : "#d8dee9";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(turretX, turretY);
      ctx.lineTo(
        turretX + Math.cos(entry.aimAngle) * 34,
        turretY + Math.sin(entry.aimAngle) * 34,
      );
      ctx.stroke();
    }
  }

  private drawProjectiles(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    for (const entry of gameState.projectiles) {
      ctx.fillStyle = entry.visual.fill;
      ctx.strokeStyle = entry.visual.stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(entry.position.x, entry.position.y, entry.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawImpactEvents(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    for (const event of gameState.impactEvents) {
      const ratio = Math.min(1, event.age / event.duration);
      const radius = 18 + ratio * 48;
      ctx.save();
      ctx.globalAlpha = 1 - ratio * 0.75;
      ctx.fillStyle = event.visual.fill;
      ctx.strokeStyle = event.visual.stroke;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(event.position.x, event.position.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = event.visual.accent;
      ctx.font = "700 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(event.visual.label, event.position.x, event.position.y + 6);
      ctx.restore();
    }
  }

  private drawTrajectoryPreview(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (
      gameState.match.phase !== "aiming" &&
      gameState.match.phase !== "thinking"
    ) {
      return;
    }

    const points = simulateTrajectoryPreview(
      gameState,
      gameState.match.activePlayerId,
    );
    ctx.fillStyle = "rgba(255, 255, 255, 0.52)";

    for (let i = 0; i < points.length; i += 3) {
      const point = points[i];
      if (!point) continue;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const headerHeight = 74;
    ctx.fillStyle = "rgba(6, 6, 8, 0.78)";
    ctx.fillRect(0, 0, this.gameViewport.width, headerHeight);
    ctx.strokeStyle = "rgba(0, 240, 255, 0.28)";
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(this.gameViewport.width, headerHeight);
    ctx.stroke();

    this.drawHeaderTankStatus(ctx, gameState);
    this.drawPowerAngleReadout(ctx, gameState);
    this.drawProjectileSelector(ctx, gameState);

    ctx.fillStyle = "#f3f4f6";
    ctx.font = "15px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    const activeTank = gameState.tanks.find(
      (entry) => entry.playerId === gameState.match.activePlayerId,
    );
    const seconds = Math.ceil(gameState.match.turnTimeRemaining);
    ctx.fillText(
      `${gameState.match.mode} | Player ${gameState.match.activePlayerId + 1} | ${gameState.match.phase} | ${seconds}s | Fuel ${Math.ceil(activeTank?.fuel ?? 0)}`,
      this.gameViewport.width / 2,
      47,
    );
    ctx.textAlign = "start";

    if (gameState.match.phase === "gameOver") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      ctx.fillRect(0, 0, this.gameViewport.width, this.gameViewport.height);
      ctx.fillStyle = "#ebc80e";
      ctx.font = "700 36px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `PLAYER ${(gameState.match.winnerPlayerId ?? 0) + 1} WINS`,
        this.gameViewport.width / 2,
        this.gameViewport.height / 2,
      );
      ctx.textAlign = "start";
    }
  }

  private drawHeaderTankStatus(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    const aliveTanks = gameState.tanks.filter((entry) => entry.alive);
    if (aliveTanks.length === 0) return;

    const leftTank = aliveTanks[0];
    const rightTank = aliveTanks[1];
    if (leftTank) {
      this.drawHeaderHealthCard(ctx, leftTank, 24, 14, "left", gameState);
    }
    if (rightTank) {
      this.drawHeaderHealthCard(
        ctx,
        rightTank,
        this.gameViewport.width - 284,
        14,
        "right",
        gameState,
      );
    }
  }

  private drawHeaderHealthCard(
    ctx: CanvasRenderingContext2D,
    entry: GameState["tanks"][number],
    x: number,
    y: number,
    align: "left" | "right",
    gameState: GameState,
  ): void {
    const width = 260;
    const ratio = Math.max(0, entry.health / entry.maxHealth);
    const selected = entry.playerId === gameState.match.activePlayerId;
    const name = `${entry.displayName} - ${entry.tankName}`;

    ctx.fillStyle = selected
      ? "rgba(235, 200, 14, 0.14)"
      : "rgba(15, 23, 42, 0.78)";
    ctx.strokeStyle = selected ? "#ebc80e" : "rgba(148, 163, 184, 0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, 44, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = entry.visual.fill;
    ctx.beginPath();
    ctx.arc(
      align === "left" ? x + 20 : x + width - 20,
      y + 22,
      10,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 13px Inter, sans-serif";
    ctx.textAlign = align;
    ctx.fillText(name, align === "left" ? x + 38 : x + width - 38, y + 17, 178);

    const barX = align === "left" ? x + 38 : x + width - 218;
    const barY = y + 26;
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(barX, barY, 180, 8);
    ctx.fillStyle =
      ratio > 0.5 ? "#39ff14" : ratio > 0.25 ? "#facc15" : "#ff3131";
    ctx.fillRect(barX, barY, 180 * ratio, 8);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.strokeRect(barX, barY, 180, 8);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "11px 'Share Tech Mono', monospace";
    ctx.textAlign = align === "left" ? "right" : "left";
    ctx.fillText(
      `${Math.ceil(entry.health)}/${entry.maxHealth}`,
      align === "left" ? x + width - 12 : x + 12,
      y + 36,
    );
    ctx.textAlign = "start";
  }

  private drawPowerAngleReadout(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (
      gameState.match.phase !== "aiming" &&
      gameState.match.phase !== "thinking"
    ) {
      return;
    }

    const activeTank = gameState.tanks.find(
      (entry) =>
        entry.playerId === gameState.match.activePlayerId && entry.alive,
    );
    if (!activeTank) return;

    const screenX = activeTank.position.x - this.cameraX;
    const bubbleY = Math.max(92, activeTank.position.y - 120);
    const power = Math.round((activeTank.power / 680) * 100);
    const angle = Math.round(Math.abs((activeTank.aimAngle * 180) / Math.PI));

    this.drawMetricBubble(ctx, screenX - 42, bubbleY, `${power}`, "POWER");
    this.drawMetricBubble(ctx, screenX + 42, bubbleY, `${angle}`, "ANGLE");
  }

  private drawMetricBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    value: string,
    label: string,
  ): void {
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.beginPath();
    ctx.roundRect(x - 34, y - 24, 68, 48, 20);
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 16px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(value, x, y - 3);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 8px Inter, sans-serif";
    ctx.fillText(label, x, y + 11);
    ctx.textAlign = "start";
  }

  private drawProjectileSelector(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (
      gameState.match.phase !== "aiming" &&
      gameState.match.phase !== "thinking"
    ) {
      return;
    }

    const activeTank = gameState.tanks.find(
      (entry) =>
        entry.playerId === gameState.match.activePlayerId && entry.alive,
    );
    if (!activeTank) return;

    const layout = getProjectileSelectorLayout(
      this.gameViewport.width,
      this.gameViewport.height,
      activeTank.loadout.length,
    );

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    for (let index = 0; index < activeTank.loadout.length; index += 1) {
      const slot = activeTank.loadout[index];
      if (!slot) continue;
      const definition =
        gameState.projectileDefinitions[slot.projectileDefinitionId];
      const selected = slot.id === activeTank.selectedProjectileSlotId;
      const x = layout.x + index * (layout.slotSize + layout.gap);
      const y = layout.y + (selected ? -8 : 0);
      const size = layout.slotSize + (selected ? 10 : 0);
      const offset = selected ? -5 : 0;

      ctx.fillStyle = selected ? "#facc15" : "rgba(15, 23, 42, 0.88)";
      ctx.strokeStyle = selected ? "#7c3aed" : "rgba(148, 163, 184, 0.35)";
      ctx.lineWidth = selected ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(x + offset, y + offset, size, size, 9);
      ctx.fill();
      ctx.stroke();

      if (definition) {
        ctx.fillStyle = definition.visual.fill;
        ctx.strokeStyle = definition.visual.stroke;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          x + layout.slotSize / 2,
          y + layout.slotSize / 2 - 6,
          layout.slotSize * 0.22,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = selected ? "#111827" : "#f8fafc";
        ctx.font = "700 16px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          definition.visual.label,
          x + layout.slotSize / 2,
          y + layout.slotSize / 2,
        );
      }

      ctx.fillStyle = selected ? "#111827" : "#cbd5e1";
      ctx.font = "700 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        slot.label,
        x + layout.slotSize / 2,
        y + layout.slotSize - 9,
      );
    }

    ctx.restore();
    ctx.textAlign = "start";
  }
}
