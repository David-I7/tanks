import type { GameSnapshot } from "../types";
import { simulateTrajectoryPreview } from "../simulation/ballistics";

export type RendererAssets = {
  tankImage?: HTMLImageElement;
};

export class CanvasGameRenderer {
  private cameraX = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly assets: RendererAssets,
  ) {}

  getCameraX(): number {
    return this.cameraX;
  }

  render(snapshot: GameSnapshot): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    this.updateCamera(snapshot);

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawSky(ctx);

    ctx.save();
    ctx.translate(-this.cameraX, 0);
    this.drawTerrain(ctx, snapshot);
    this.drawTrajectoryPreview(ctx, snapshot);
    this.drawProjectiles(ctx, snapshot);
    this.drawTanks(ctx, snapshot);
    ctx.restore();

    this.drawHud(ctx, snapshot);
  }

  private updateCamera(snapshot: GameSnapshot): void {
    const activeTank = snapshot.tanks.find((entry) => entry.tank.playerId === snapshot.match.activePlayerId);
    const focusX = snapshot.projectiles[0]?.position.x ?? activeTank?.position.x ?? this.canvas.width / 2;
    const maxCameraX = Math.max(0, snapshot.terrain.length - this.canvas.width);
    const targetCameraX = Math.max(0, Math.min(maxCameraX, focusX - this.canvas.width * 0.5));
    this.cameraX += (targetCameraX - this.cameraX) * 0.12;
  }

  private drawSky(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#101827");
    gradient.addColorStop(0.58, "#26374a");
    gradient.addColorStop(1, "#0b0c10");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
    ctx.beginPath();
    ctx.moveTo(0, this.canvas.height + 80);
    for (let x = 0; x < snapshot.terrain.length; x += 1) {
      ctx.lineTo(x, snapshot.terrain[x] ?? this.canvas.height);
    }
    ctx.lineTo(snapshot.terrain.length, this.canvas.height + 80);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, this.canvas.height * 0.5, 0, this.canvas.height);
    gradient.addColorStop(0, "#47724a");
    gradient.addColorStop(1, "#1d3221");
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private drawTanks(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
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
        ctx.fillStyle = entry.tank.playerId === 0 ? "#39ff14" : "#ff3131";
        ctx.fillRect(-24, -24, 48, 22);
      }

      ctx.restore();

      const turretX = entry.position.x;
      const turretY = entry.position.y - 22;
      ctx.strokeStyle = entry.tank.playerId === snapshot.match.activePlayerId ? "#ebc80e" : "#d8dee9";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(turretX, turretY);
      ctx.lineTo(turretX + Math.cos(entry.tank.aimAngle) * 34, turretY + Math.sin(entry.tank.aimAngle) * 34);
      ctx.stroke();

      this.drawHealthBar(ctx, entry.position.x, entry.position.y - 48, entry.tank.health / entry.tank.maxHealth);
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
    for (const entry of snapshot.projectiles) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(entry.position.x, entry.position.y, entry.projectile.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTrajectoryPreview(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
    if (
      snapshot.match.phase !== "aiming" &&
      snapshot.match.phase !== "thinking"
    ) {
      return;
    }

    const points = simulateTrajectoryPreview(snapshot, snapshot.match.activePlayerId);
    ctx.fillStyle = "rgba(255, 255, 255, 0.52)";

    for (let i = 0; i < points.length; i += 3) {
      const point = points[i];
      if (!point) continue;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, ratio: number): void {
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(x - 24, y, 48, 6);
    ctx.fillStyle = ratio > 0.5 ? "#39ff14" : "#ff3131";
    ctx.fillRect(x - 24, y, 48 * Math.max(0, ratio), 6);
  }

  private drawHud(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
    ctx.fillStyle = "rgba(6, 6, 8, 0.72)";
    ctx.fillRect(16, 16, 292, 88);
    ctx.strokeStyle = "rgba(0, 240, 255, 0.35)";
    ctx.strokeRect(16, 16, 292, 88);

    ctx.fillStyle = "#f3f4f6";
    ctx.font = "16px 'Share Tech Mono', monospace";
    ctx.fillText(`Mode: ${snapshot.match.mode}`, 32, 42);
    ctx.fillText(
      `Turn: Player ${snapshot.match.activePlayerId + 1} / ${snapshot.match.phase}`,
      32,
      66,
    );

    const activeTank = snapshot.tanks.find(
      (entry) => entry.tank.playerId === snapshot.match.activePlayerId,
    );
    const seconds = Math.ceil(snapshot.match.turnTimeRemaining);
    ctx.fillText(
      `Time: ${seconds}s   Fuel: ${Math.ceil(activeTank?.tank.fuel ?? 0)}`,
      32,
      90,
    );

    if (snapshot.match.phase === "gameOver") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = "#ebc80e";
      ctx.font = "700 36px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`PLAYER ${(snapshot.match.winnerPlayerId ?? 0) + 1} WINS`, this.canvas.width / 2, this.canvas.height / 2);
      ctx.textAlign = "start";
    }
  }
}
