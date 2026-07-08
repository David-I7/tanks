import type { GameSnapshot } from "../types";
import { simulateTrajectoryPreview } from "../simulation/ballistics";
import { getProjectileSelectorLayout } from "../input/projectileSelectorHitTest";
import type { ViewportSize } from "../world/worldSizing";

export type RendererAssets = {
  tankImage?: HTMLImageElement;
};

type RenderContext = {
  viewport: ViewportSize;
  cameraX: number;
  assets: RendererAssets;
};

type RenderPass = {
  name: string;
  draw(
    ctx: CanvasRenderingContext2D,
    snapshot: GameSnapshot,
    context: RenderContext,
  ): void;
};

export class CanvasGameRenderer {
  private cameraX = 0;
  private viewport: ViewportSize;
  private readonly worldPasses: RenderPass[];
  private readonly overlayPasses: RenderPass[];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly assets: RendererAssets,
    viewport?: ViewportSize,
  ) {
    this.viewport = viewport ?? { width: canvas.width, height: canvas.height };
    this.worldPasses = [
      {
        name: "terrain",
        draw: (ctx, snapshot) => this.drawTerrain(ctx, snapshot),
      },
      {
        name: "trajectoryPreview",
        draw: (ctx, snapshot) => this.drawTrajectoryPreview(ctx, snapshot),
      },
      {
        name: "impactEvents",
        draw: (ctx, snapshot) => this.drawImpactEvents(ctx, snapshot),
      },
      {
        name: "projectiles",
        draw: (ctx, snapshot) => this.drawProjectiles(ctx, snapshot),
      },
      { name: "tanks", draw: (ctx, snapshot) => this.drawTanks(ctx, snapshot) },
    ];
    this.overlayPasses = [
      { name: "hud", draw: (ctx, snapshot) => this.drawHud(ctx, snapshot) },
    ];
  }

  setViewport(viewport: ViewportSize): void {
    this.viewport = viewport;
  }

  getViewport(): ViewportSize {
    return this.viewport;
  }

  getCameraX(): number {
    return this.cameraX;
  }

  render(snapshot: GameSnapshot): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    this.updateCamera(snapshot);

    ctx.setTransform(
      this.canvas.width / this.viewport.width,
      0,
      0,
      this.canvas.height / this.viewport.height,
      0,
      0,
    );
    ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
    this.drawSky(ctx);

    const renderContext = {
      viewport: this.viewport,
      cameraX: this.cameraX,
      assets: this.assets,
    };

    ctx.save();
    ctx.translate(-this.cameraX, 0);
    for (const pass of this.worldPasses) {
      pass.draw(ctx, snapshot, renderContext);
    }
    ctx.restore();

    for (const pass of this.overlayPasses) {
      pass.draw(ctx, snapshot, renderContext);
    }
  }

  private updateCamera(snapshot: GameSnapshot): void {
    const activeTank = snapshot.tanks.find(
      (entry) => entry.tank.playerId === snapshot.match.activePlayerId,
    );
    const focusX =
      snapshot.projectiles[0]?.position.x ??
      activeTank?.position.x ??
      this.viewport.width / 2;
    const maxCameraX = Math.max(
      0,
      snapshot.terrain.width - this.viewport.width,
    );
    const targetCameraX = Math.max(
      0,
      Math.min(maxCameraX, focusX - this.viewport.width * 0.5),
    );
    this.cameraX += (targetCameraX - this.cameraX) * 0.12;
  }

  private drawSky(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.viewport.height);
    gradient.addColorStop(0, "#101827");
    gradient.addColorStop(0.58, "#26374a");
    gradient.addColorStop(1, "#0b0c10");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
  }

  private drawTerrain(
    ctx: CanvasRenderingContext2D,
    snapshot: GameSnapshot,
  ): void {
    if (snapshot.terrain.kind !== "heightmap") return;

    ctx.beginPath();
    ctx.moveTo(0, this.viewport.height + 80);
    for (let x = 0; x < snapshot.terrain.width; x += 1) {
      ctx.lineTo(x, snapshot.terrain.surface[x] ?? this.viewport.height);
    }
    ctx.lineTo(snapshot.terrain.width, this.viewport.height + 80);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(
      0,
      this.viewport.height * 0.5,
      0,
      this.viewport.height,
    );
    gradient.addColorStop(0, "#47724a");
    gradient.addColorStop(1, "#1d3221");
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private drawTanks(
    ctx: CanvasRenderingContext2D,
    snapshot: GameSnapshot,
  ): void {
    for (const entry of snapshot.tanks) {
      if (!entry.tank.alive) continue;

      ctx.save();
      ctx.translate(entry.position.x, entry.position.y);
      ctx.rotate(entry.tank.bodyAngle);

      if (this.assets.tankImage?.complete) {
        const image = this.assets.tankImage;
        ctx.scale(entry.tank.facing, 1);
        ctx.drawImage(image, -24, -30, 48, 28);
      } else {
        ctx.fillStyle = entry.tank.visual.fill;
        ctx.strokeStyle = entry.tank.visual.stroke;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-25, -27, 50, 24, 7);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = entry.tank.visual.accent;
        ctx.beginPath();
        ctx.arc(0, -28, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      const turretX = entry.position.x;
      const turretY = entry.position.y - 22;
      ctx.strokeStyle =
        entry.tank.playerId === snapshot.match.activePlayerId
          ? "#ebc80e"
          : "#d8dee9";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(turretX, turretY);
      ctx.lineTo(
        turretX + Math.cos(entry.tank.aimAngle) * 34,
        turretY + Math.sin(entry.tank.aimAngle) * 34,
      );
      ctx.stroke();
    }
  }

  private drawProjectiles(
    ctx: CanvasRenderingContext2D,
    snapshot: GameSnapshot,
  ): void {
    for (const entry of snapshot.projectiles) {
      ctx.fillStyle = entry.projectile.visual.fill;
      ctx.strokeStyle = entry.projectile.visual.stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        entry.position.x,
        entry.position.y,
        entry.projectile.radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawImpactEvents(
    ctx: CanvasRenderingContext2D,
    snapshot: GameSnapshot,
  ): void {
    for (const event of snapshot.impactEvents) {
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
    snapshot: GameSnapshot,
  ): void {
    if (
      snapshot.match.phase !== "aiming" &&
      snapshot.match.phase !== "thinking"
    ) {
      return;
    }

    const points = simulateTrajectoryPreview(
      snapshot,
      snapshot.match.activePlayerId,
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

  private drawHud(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
    const headerHeight = 74;
    ctx.fillStyle = "rgba(6, 6, 8, 0.78)";
    ctx.fillRect(0, 0, this.viewport.width, headerHeight);
    ctx.strokeStyle = "rgba(0, 240, 255, 0.28)";
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(this.viewport.width, headerHeight);
    ctx.stroke();

    this.drawHeaderTankStatus(ctx, snapshot);
    this.drawPowerAngleReadout(ctx, snapshot);
    this.drawProjectileSelector(ctx, snapshot);

    ctx.fillStyle = "#f3f4f6";
    ctx.font = "15px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    const activeTank = snapshot.tanks.find(
      (entry) => entry.tank.playerId === snapshot.match.activePlayerId,
    );
    const seconds = Math.ceil(snapshot.match.turnTimeRemaining);
    ctx.fillText(
      `${snapshot.match.mode} | Player ${snapshot.match.activePlayerId + 1} | ${snapshot.match.phase} | ${seconds}s | Fuel ${Math.ceil(activeTank?.tank.fuel ?? 0)}`,
      this.viewport.width / 2,
      47,
    );
    ctx.textAlign = "start";

    if (snapshot.match.phase === "gameOver") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
      ctx.fillStyle = "#ebc80e";
      ctx.font = "700 36px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `PLAYER ${(snapshot.match.winnerPlayerId ?? 0) + 1} WINS`,
        this.viewport.width / 2,
        this.viewport.height / 2,
      );
      ctx.textAlign = "start";
    }
  }

  private drawHeaderTankStatus(
    ctx: CanvasRenderingContext2D,
    snapshot: GameSnapshot,
  ): void {
    const aliveTanks = snapshot.tanks.filter((entry) => entry.tank.alive);
    if (aliveTanks.length === 0) return;

    const leftTank = aliveTanks[0];
    const rightTank = aliveTanks[1];
    if (leftTank) {
      this.drawHeaderHealthCard(ctx, leftTank, 24, 14, "left", snapshot);
    }
    if (rightTank) {
      this.drawHeaderHealthCard(
        ctx,
        rightTank,
        this.viewport.width - 284,
        14,
        "right",
        snapshot,
      );
    }
  }

  private drawHeaderHealthCard(
    ctx: CanvasRenderingContext2D,
    entry: GameSnapshot["tanks"][number],
    x: number,
    y: number,
    align: "left" | "right",
    snapshot: GameSnapshot,
  ): void {
    const width = 260;
    const ratio = Math.max(0, entry.tank.health / entry.tank.maxHealth);
    const selected = entry.tank.playerId === snapshot.match.activePlayerId;
    const name = `${entry.tank.displayName} - ${entry.tank.tankName}`;

    ctx.fillStyle = selected
      ? "rgba(235, 200, 14, 0.14)"
      : "rgba(15, 23, 42, 0.78)";
    ctx.strokeStyle = selected ? "#ebc80e" : "rgba(148, 163, 184, 0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, 44, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = entry.tank.visual.fill;
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
      `${Math.ceil(entry.tank.health)}/${entry.tank.maxHealth}`,
      align === "left" ? x + width - 12 : x + 12,
      y + 36,
    );
    ctx.textAlign = "start";
  }

  private drawPowerAngleReadout(
    ctx: CanvasRenderingContext2D,
    snapshot: GameSnapshot,
  ): void {
    if (
      snapshot.match.phase !== "aiming" &&
      snapshot.match.phase !== "thinking"
    ) {
      return;
    }

    const activeTank = snapshot.tanks.find(
      (entry) =>
        entry.tank.playerId === snapshot.match.activePlayerId &&
        entry.tank.alive,
    );
    if (!activeTank) return;

    const screenX = activeTank.position.x - this.cameraX;
    const bubbleY = Math.max(92, activeTank.position.y - 120);
    const power = Math.round((activeTank.tank.power / 680) * 100);
    const angle = Math.round(
      Math.abs((activeTank.tank.aimAngle * 180) / Math.PI),
    );

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
    snapshot: GameSnapshot,
  ): void {
    if (
      snapshot.match.phase !== "aiming" &&
      snapshot.match.phase !== "thinking"
    ) {
      return;
    }

    const activeTank = snapshot.tanks.find(
      (entry) =>
        entry.tank.playerId === snapshot.match.activePlayerId &&
        entry.tank.alive,
    );
    if (!activeTank) return;

    const layout = getProjectileSelectorLayout(
      this.viewport.width,
      this.viewport.height,
      activeTank.tank.loadout.length,
    );

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    for (let index = 0; index < activeTank.tank.loadout.length; index += 1) {
      const slot = activeTank.tank.loadout[index];
      if (!slot) continue;
      const definition =
        snapshot.projectileDefinitions[slot.projectileDefinitionId];
      const selected = slot.id === activeTank.tank.selectedProjectileSlotId;
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
