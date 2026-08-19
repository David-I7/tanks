import type { GameState } from "../types";
import { simulateTrajectoryPreview } from "../simulation/ballistics";
import {
  getCompactWeaponSelectorLayout,
  getExpandedWeaponDrawerLayout,
  getFireButtonLayout,
  getDualHeaderHealthLayout,
  getCentralTelemetryLayout,
  getFuelGaugeLayout,
  getVirtualTouchControlsLayout,
  DEFAULT_MAX_AIM_POWER,
} from "../input/inputHelpers";
import { ResourceManager } from "./ResourceManager";
import type { DpiViewport, GameViewport } from "../world/worldSizing";
import type { CanvasHoverTarget } from "../input/CanvasInputSource";

type RenderContext = {
  gameViewport: GameViewport;
  cameraX: number;
};

type RenderPass = {
  name: string;
  draw(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    context: RenderContext,
  ): void;
};

type BiomeTheme = {
  skyStops: [number, string][];
  sunStops: [number, string][];
  mountainFill: string;
  terrainStops: [number, string][];
  terrainStroke: string;
  terrainShadow: string;
  treeTrunk: string;
  treeCanopy1: string;
  treeCanopy2: string;
  rockFill: string;
  rockStroke: string;
  grassStroke: string;
};

const BIOME_THEMES: Record<"forest" | "desert" | "ice", BiomeTheme> = {
  forest: {
    skyStops: [
      [0, "#0b091a"],
      [0.35, "#1e0b36"],
      [0.7, "#4c1d95"],
      [1, "#831843"],
    ],
    sunStops: [
      [0, "rgba(251, 146, 60, 0.9)"],
      [0.4, "rgba(244, 63, 94, 0.4)"],
      [1, "rgba(131, 24, 67, 0)"],
    ],
    mountainFill: "rgba(30, 11, 54, 0.65)",
    terrainStops: [
      [0, "#15803d"],
      [0.2, "#166534"],
      [0.5, "#14532d"],
      [1, "#052e16"],
    ],
    terrainStroke: "#4ade80",
    terrainShadow: "#22c55e",
    treeTrunk: "#78350f",
    treeCanopy1: "#16a34a",
    treeCanopy2: "#15803d",
    rockFill: "#64748b",
    rockStroke: "#94a3b8",
    grassStroke: "#4ade80",
  },
  desert: {
    skyStops: [
      [0, "#1e0b12"],
      [0.35, "#3b132b"],
      [0.7, "#9a3412"],
      [1, "#ea580c"],
    ],
    sunStops: [
      [0, "rgba(253, 224, 71, 0.95)"],
      [0.4, "rgba(249, 115, 22, 0.5)"],
      [1, "rgba(234, 88, 12, 0)"],
    ],
    mountainFill: "rgba(67, 20, 7, 0.65)",
    terrainStops: [
      [0, "#d97706"],
      [0.2, "#b45309"],
      [0.5, "#78350f"],
      [1, "#451a03"],
    ],
    terrainStroke: "#fbbf24",
    terrainShadow: "#f59e0b",
    treeTrunk: "#92400e",
    treeCanopy1: "#d97706",
    treeCanopy2: "#b45309",
    rockFill: "#78350f",
    rockStroke: "#d97706",
    grassStroke: "#f59e0b",
  },
  ice: {
    skyStops: [
      [0, "#030712"],
      [0.35, "#082f49"],
      [0.7, "#0e7490"],
      [1, "#155e75"],
    ],
    sunStops: [
      [0, "rgba(224, 242, 254, 0.9)"],
      [0.4, "rgba(56, 189, 248, 0.4)"],
      [1, "rgba(14, 116, 144, 0)"],
    ],
    mountainFill: "rgba(12, 74, 110, 0.65)",
    terrainStops: [
      [0, "#0284c7"],
      [0.2, "#0369a1"],
      [0.5, "#075985"],
      [1, "#0c4a6e"],
    ],
    terrainStroke: "#38bdf8",
    terrainShadow: "#0284c7",
    treeTrunk: "#78350f",
    treeCanopy1: "#38bdf8",
    treeCanopy2: "#0284c7",
    rockFill: "#0284c7",
    rockStroke: "#bae6fd",
    grassStroke: "#38bdf8",
  },
};

export class CanvasGameRenderer {
  private cameraX = 0;
  private gameViewport: GameViewport;
  private dpiViewport: DpiViewport;
  private screenShakeIntensity = 0;
  private lastImpactCount = 0;
  private hoverTarget: CanvasHoverTarget = null;
  private isWeaponDrawerOpen = false;
  private readonly worldPasses: RenderPass[];
  private readonly overlayPasses: RenderPass[];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    gameViewport: GameViewport,
    dpiViewport: DpiViewport,
  ) {
    this.gameViewport = gameViewport;
    this.dpiViewport = dpiViewport;
    this.worldPasses = [
      {
        name: "terrain",
        draw: (ctx, gameState) => this.drawTerrain(ctx, gameState),
      },
      {
        name: "decors",
        draw: (ctx, gameState) => this.drawDecors(ctx, gameState),
      },
      {
        name: "lootCrates",
        draw: (ctx, gameState) => this.drawLootCrates(ctx, gameState),
      },
      {
        name: "tanks",
        draw: (ctx, gameState) => this.drawTanks(ctx, gameState),
      },
      {
        name: "projectiles",
        draw: (ctx, gameState) => this.drawProjectiles(ctx, gameState),
      },
      {
        name: "impactEvents",
        draw: (ctx, gameState) => this.drawImpactEvents(ctx, gameState),
      },
      {
        name: "particles",
        draw: (ctx, gameState) => this.drawParticles(ctx, gameState),
      },
      {
        name: "floatingTexts",
        draw: (ctx, gameState) => this.drawFloatingTexts(ctx, gameState),
      },
      {
        name: "trajectoryPreview",
        draw: (ctx, gameState) => this.drawTrajectoryPreview(ctx, gameState),
      },
    ];
    this.overlayPasses = [
      { name: "hud", draw: (ctx, gameState) => this.drawHud(ctx, gameState) },
    ];
  }

  setHoverTarget(hoverTarget: CanvasHoverTarget): void {
    this.hoverTarget = hoverTarget;
  }

  setIsWeaponDrawerOpen(isOpen: boolean): void {
    this.isWeaponDrawerOpen = isOpen;
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

    const maxCameraX = Math.max(
      0,
      gameState.terrain.width - this.gameViewport.width,
    );
    const focusX = gameState.match.cameraX ?? 0;
    this.cameraX = Math.max(
      0,
      Math.min(maxCameraX, focusX - this.gameViewport.width * 0.5),
    );

    const currentImpactCount = gameState.impactEvents.length;
    if (currentImpactCount > this.lastImpactCount) {
      const lastEvent = gameState.impactEvents[gameState.impactEvents.length - 1];
      const isSignature =
        Boolean(lastEvent) &&
        (lastEvent.animationId === "nuke" ||
          lastEvent.animationId === "red-slam" ||
          lastEvent.animationId === "purple-burst" ||
          lastEvent.animationId === "cyan-beam" ||
          (lastEvent.visual?.label &&
            ["NUKE", "PLS", "CLU", "TOX", "G-SHT", "S-VLY", "AUTO"].some((l) =>
              lastEvent.visual?.label?.includes(l),
            )));
      this.screenShakeIntensity = isSignature ? 22 : 12;
    }
    this.lastImpactCount = currentImpactCount;

    const shakeX = (Math.random() * 2 - 1) * this.screenShakeIntensity;
    const shakeY = (Math.random() * 2 - 1) * this.screenShakeIntensity;
    this.screenShakeIntensity *= 0.85;
    if (this.screenShakeIntensity < 0.1) this.screenShakeIntensity = 0;

    ctx.setTransform(
      this.dpiViewport.width / this.gameViewport.width,
      0,
      0,
      this.dpiViewport.height / this.gameViewport.height,
      0,
      0,
    );
    ctx.clearRect(0, 0, this.gameViewport.width, this.gameViewport.height);
    this.drawSky(ctx, gameState);

    const renderContext = {
      gameViewport: this.gameViewport,
      cameraX: this.cameraX,
    };

    ctx.save();
    ctx.translate(-this.cameraX + shakeX, shakeY);
    for (const pass of this.worldPasses) {
      pass.draw(ctx, gameState, renderContext);
    }
    ctx.restore();

    for (const pass of this.overlayPasses) {
      pass.draw(ctx, gameState, renderContext);
    }
  }

  private drawSky(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const theme = BIOME_THEMES[gameState.match.biome ?? "forest"] ?? BIOME_THEMES.forest;
    const width = this.gameViewport.width;
    const height = this.gameViewport.height;
    const worldWidth = gameState.terrain.width;
    const maxCameraX = Math.max(1, worldWidth - width);
    const camRatio = Math.max(0, Math.min(1, this.cameraX / maxCameraX));

    // 1. Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    for (const [stop, color] of theme.skyStops) {
      skyGrad?.addColorStop?.(stop, color);
    }
    if (skyGrad) ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Dynamic Twinkling & Glowing Star Field (seamlessly wrapped with parallax)
    ctx.save();
    const now = Date.now();
    const starSpan = worldWidth + width;
    const starParallax = this.cameraX * 0.2;
    for (let i = 0; i < 75; i++) {
      const hashX = Math.sin(i * 12.9898 + 1.5) * 43758.5453;
      const hashY = Math.cos(i * 78.233 + 3.1) * 43758.5453;
      const rawX = (hashX - Math.floor(hashX)) * starSpan;
      const baseY = (hashY - Math.floor(hashY)) * (height * 0.48);

      const driftX = Math.sin(now * 0.00015 + i * 1.7) * 4;
      const sx = (((rawX + driftX - starParallax) % starSpan) + starSpan) % starSpan - 20;
      const sy = baseY + Math.cos(now * 0.0002 + i * 2.1) * 2;

      if (sx < -20 || sx > width + 20) continue;

      const pulse = Math.sin(now * 0.0025 + i * 1.3);
      const alpha = 0.35 + (pulse * 0.5 + 0.5) * 0.55;
      const coreSize = 1.0 + (pulse * 0.5 + 0.5) * 0.8;

      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(sx, sy, coreSize * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 242, 254, ${alpha * 0.25})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(sx, sy, coreSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
    ctx.restore();

    // 3. Sun / Celestial Orb (consistently positioned in upper sky with gentle parallax)
    ctx.save();
    const sunScreenX = width * 0.62 - camRatio * (width * 0.2);
    const sunY = height * 0.24;
    const sunRadius = Math.min(140, Math.max(90, height * 0.2));
    const sunGrad = ctx.createRadialGradient(
      sunScreenX,
      sunY,
      10,
      sunScreenX,
      sunY,
      sunRadius,
    );
    for (const [stop, color] of theme.sunStops) {
      sunGrad?.addColorStop?.(stop, color);
    }
    if (sunGrad) ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunScreenX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Moving Clouds (smoothly wrapped across sky)
    if (gameState.clouds) {
      gameState.clouds.forEach((cloud) => {
        const screenX = cloud.x - this.cameraX * 0.5;
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity * 0.25})`;
        ctx.beginPath();
        ctx.arc(screenX, cloud.y, 25 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(
          screenX + 20 * cloud.scale,
          cloud.y - 10 * cloud.scale,
          30 * cloud.scale,
          0,
          Math.PI * 2,
        );
        ctx.arc(
          screenX + 45 * cloud.scale,
          cloud.y,
          22 * cloud.scale,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();
      });
    }
  }

  private drawTerrain(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (gameState.terrain.kind !== "heightmap") return;
    const theme = BIOME_THEMES[gameState.match.biome ?? "forest"] ?? BIOME_THEMES.forest;

    ctx.beginPath();
    ctx.moveTo(0, this.gameViewport.height + 80);
    for (let x = 0; x < gameState.terrain.width; x += 1) {
      ctx.lineTo(x, gameState.terrain.surface[x] ?? this.gameViewport.height);
    }
    ctx.lineTo(gameState.terrain.width, this.gameViewport.height + 80);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(
      0,
      this.gameViewport.height * 0.3,
      0,
      this.gameViewport.height,
    );
    for (const [stop, color] of theme.terrainStops) {
      gradient?.addColorStop?.(stop, color);
    }
    if (gradient) ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = theme.terrainStroke;
    ctx.stroke();
  }

  private drawDecors(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (!gameState.decors) return;
    const theme = BIOME_THEMES[gameState.match.biome ?? "forest"] ?? BIOME_THEMES.forest;

    gameState.decors.forEach((dec) => {
      if (dec.destroyed) {
        return;
      }
      ctx.save();
      ctx.translate(dec.x, dec.y);
      ctx.rotate(dec.rotation);
      ctx.scale(dec.scale, dec.scale);
      if (dec.type === "tree") {
        ctx.fillStyle = theme.treeTrunk;
        ctx.fillRect(-4, -12, 8, 12);
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(-18, -20);
        ctx.lineTo(18, -20);
        ctx.closePath();
        ctx.fillStyle = theme.treeCanopy1;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(-22, -10);
        ctx.lineTo(22, -10);
        ctx.closePath();
        ctx.fillStyle = theme.treeCanopy2;
        ctx.fill();
      } else if (dec.type === "rock") {
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(-10, -14);
        ctx.lineTo(4, -18);
        ctx.lineTo(14, -8);
        ctx.lineTo(10, 0);
        ctx.closePath();
        ctx.fillStyle = theme.rockFill;
        ctx.fill();
        ctx.strokeStyle = theme.rockStroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (dec.type === "bunker") {
        ctx.beginPath();
        ctx.roundRect(-16, -14, 32, 14, 3);
        ctx.fillStyle = "#475569";
        ctx.fill();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-10, -10, 20, 4);
      } else {
        ctx.strokeStyle = theme.grassStroke;
        ctx.lineWidth = 2;
        for (let g = -8; g <= 8; g += 4) {
          ctx.beginPath();
          ctx.moveTo(g, 0);
          ctx.lineTo(g * 1.3, -10);
          ctx.stroke();
        }
      }

      ctx.restore();
    });
  }

  private drawTanks(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    for (const entry of gameState.tanks) {
      if (!entry.alive) continue;
      const isActive = entry.playerId === gameState.match.activePlayerId;
      const mainColor = entry.visual.fill;
      const strokeColor = entry.visual.stroke;
      const accentColor = entry.visual.accent;

      ctx.save();
      ctx.translate(entry.position.x, entry.position.y);
      ctx.rotate(entry.bodyAngle);

      // Clean glowing halo beneath active tank tracks on the ground
      if (isActive) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 14, 28, 6.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `${mainColor}33`;
        ctx.fill();
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 2.5]);
        ctx.stroke();
        ctx.restore();
      }

      // Barrel (aimAngle is relative to tank body [-PI, 0])
      const rad = entry.aimAngle;
      const barrelLength = entry.barrelLength ?? 28;
      const turretYOffset = entry.turretYOffset ?? -14;
      const muzzleX = Math.cos(rad) * barrelLength;
      const muzzleY = turretYOffset + Math.sin(rad) * barrelLength;

      ctx.beginPath();
      ctx.moveTo(0, turretYOffset);
      ctx.lineTo(muzzleX, muzzleY);
      ctx.lineWidth = 5;
      ctx.strokeStyle = mainColor;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Tank Body
      ctx.beginPath();
      ctx.roundRect(-18, -14, 36, 14, 4);
      const bodyGrad = ctx.createLinearGradient(0, -14, 0, 0);
      bodyGrad.addColorStop(0, mainColor);
      bodyGrad.addColorStop(1, strokeColor);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Treads & Wheels (resting flush with terrain stroke)
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(-22, 2, 44, 12, 3);
      ctx.fill();
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      for (let wx = -15; wx <= 15; wx += 10) {
        ctx.beginPath();
        ctx.arc(wx, 8, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#64748b";
        ctx.fill();
      }

      // Turn indicator downward triangle pulsing above active tank
      if (isActive && gameState.match.phase === "thinking") {
        const bounce = Math.sin(Date.now() * 0.006) * 3;
        const arrowY = -34 + bounce;
        ctx.save();
        ctx.fillStyle = "#facc15";
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#facc15";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-6, arrowY - 8);
        ctx.lineTo(6, arrowY - 8);
        ctx.lineTo(0, arrowY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }
  }

  private drawProjectiles(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    for (const entry of gameState.projectiles) {
      ctx.save();
      ctx.translate(entry.position.x, entry.position.y);
      const angle = Math.atan2(entry.velocity.y, entry.velocity.x);
      ctx.rotate(angle);

      const radius = entry.radius || 4;
      const mainColor = "#f59e0b";
      const strokeColor = "#d97706";

      // Tail flame / glow
      ctx.beginPath();
      ctx.moveTo(-radius * 2.5, 0);
      ctx.lineTo(0, -radius * 0.8);
      ctx.lineTo(0, radius * 0.8);
      ctx.closePath();
      ctx.fillStyle = `${strokeColor}88`;
      ctx.fill();

      // Shell core
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = mainColor;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    // Draw active Damage Trail hazard zones
    if (gameState.damageTrails) {
      for (const trail of gameState.damageTrails) {
        ctx.save();
        ctx.translate(trail.position.x, trail.position.y);
        const pulse = Math.sin(Date.now() * 0.008) * 4;
        ctx.beginPath();
        ctx.arc(0, 0, trail.radius + pulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
        ctx.fill();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
      }
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

  private drawLootCrates(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (!gameState.lootCrates) return;

    for (const crate of gameState.lootCrates) {
      if (crate.collected) continue;

      ctx.save();
      ctx.translate(crate.x, crate.y);

      if (crate.isLanding) {
        ctx.beginPath();
        ctx.arc(0, -38, 18, Math.PI, 0);
        ctx.fillStyle = "rgba(244, 63, 94, 0.85)";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-18, -38);
        ctx.lineTo(-8, -24);
        ctx.moveTo(18, -38);
        ctx.lineTo(8, -24);
        ctx.moveTo(0, -38);
        ctx.lineTo(0, -24);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const color =
        crate.crateType === "hp"
          ? "#22c55e"
          : crate.crateType === "fuel"
          ? "#f59e0b"
          : "#a855f7";

      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-12, -24, 24, 24, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        crate.crateType === "hp" ? "HP" : crate.crateType === "fuel" ? "F" : "A",
        0,
        -8,
      );

      ctx.restore();
    }
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (!gameState.particles) return;

    for (const p of gameState.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFloatingTexts(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (!gameState.floatingTexts) return;

    for (const ft of gameState.floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 6;
      ctx.font = "700 16px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private drawTrajectoryPreview(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (
      gameState.match.phase !== "thinking" ||
      (gameState.projectiles && gameState.projectiles.length > 0)
    ) {
      return;
    }

    const activePlayerId = gameState.match.activePlayerId;
    const activeTank = gameState.tanks.find(
      (t) => t.playerId === activePlayerId && t.alive,
    );

    if (!activeTank || activeTank.controllerKind === "remote") {
      return;
    }

    const points = simulateTrajectoryPreview(gameState, activePlayerId, 300);
    if (points.length === 0) return;

    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";

    for (let i = 0; i < points.length; i += 2) {
      const point = points[i];
      if (!point) continue;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const lastPoint = points[points.length - 1];
    if (lastPoint && gameState.terrain.kind === "heightmap") {
      const clampedX = Math.max(
        0,
        Math.min(gameState.terrain.width - 1, Math.floor(lastPoint.x)),
      );
      const surfaceY = gameState.terrain.surface[clampedX];
      if (surfaceY !== undefined && Math.abs(lastPoint.y - surfaceY) <= 4) {
        ctx.save();
        ctx.translate(lastPoint.x, surfaceY);

        // Target Crosshair at terrain level
        const radius = 10;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-radius - 3, 0);
        ctx.lineTo(-radius + 3, 0);
        ctx.moveTo(radius - 3, 0);
        ctx.lineTo(radius + 3, 0);
        ctx.moveTo(0, -radius - 3);
        ctx.lineTo(0, -radius + 3);
        ctx.moveTo(0, radius - 3);
        ctx.lineTo(0, radius + 3);
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.restore();
      }
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const width = this.gameViewport.width;
    const headerHeight = 88;

    // Header subtle gradient backdrop
    const headerGrad = ctx.createLinearGradient(0, 0, 0, headerHeight);
    headerGrad.addColorStop(0, "rgba(6, 6, 12, 0.92)");
    headerGrad.addColorStop(0.7, "rgba(9, 11, 20, 0.82)");
    headerGrad.addColorStop(1, "rgba(9, 11, 20, 0)");
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, width, headerHeight);

    this.drawConnectedDualHealthBar(ctx, gameState);
    this.drawCentralTelemetryCapsule(ctx, gameState);
    this.drawRelockCameraButton(ctx, gameState);
    this.drawFuelGauge(ctx, gameState);
    this.drawPowerAngleReadout(ctx, gameState);
    this.drawCompactWeaponSelector(ctx, gameState);
    this.drawFireButton(ctx, gameState);
    this.drawExpandedWeaponDrawer(ctx, gameState);
    this.drawMobileControls(ctx, gameState);
    this.drawGameOverBanner(ctx, gameState);
  }

  private drawConnectedDualHealthBar(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    const layout = getDualHeaderHealthLayout(this.gameViewport.width);
    const p1 = gameState.tanks[0];
    const p2 = gameState.tanks[1];
    const activePlayerId = gameState.match.activePlayerId;

    // --- 1. Left Tank Bar (Player 1: Cyan-to-Blue) ---
    if (p1) {
      const p1Layout = layout.p1;
      const isActiveP1 = p1.alive && p1.playerId === activePlayerId;
      const ratioP1 = Math.max(0, Math.min(1, p1.health / p1.maxHealth));

      ctx.save();
      if (isActiveP1) {
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
      ctx.strokeStyle = isActiveP1 ? "#00f0ff" : "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = isActiveP1 ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(p1Layout.x, p1Layout.y, p1Layout.width, p1Layout.height, 8);
      ctx.fill();
      ctx.stroke();

      // P1 Health Fill (Right-to-left towards VS badge)
      const barPadding = 4;
      const barX = p1Layout.x + barPadding;
      const barY = p1Layout.y + 19;
      const barW = p1Layout.width - barPadding * 2;
      const barH = 12;

      // Track
      ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 4);
      ctx.fill();

      // Progress Gradient
      const fillW = barW * ratioP1;
      if (fillW > 0) {
        const p1Grad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
        p1Grad.addColorStop(0, "#0284c7");
        p1Grad.addColorStop(0.5, "#00f0ff");
        p1Grad.addColorStop(1, "#38bdf8");
        ctx.fillStyle = p1Grad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillW, barH, 4);
        ctx.fill();
      }

      // Player 1 Name & HP
      ctx.fillStyle = p1.alive ? "#00f0ff" : "#ef4444";
      ctx.beginPath();
      ctx.arc(p1Layout.x + 12, p1Layout.y + 11, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 11px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(p1.displayName || "Player 1", p1Layout.x + 22, p1Layout.y + 14);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "700 10px 'Share Tech Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(
        `${Math.ceil(p1.health)}/${p1.maxHealth}`,
        p1Layout.x + p1Layout.width - 8,
        p1Layout.y + 14,
      );
      ctx.restore();
    }

    // --- 2. Center "VS" Fiery Badge ---
    const vsLayout = layout.vs;
    ctx.save();
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 12;
    const vsGrad = ctx.createLinearGradient(
      vsLayout.x,
      vsLayout.y,
      vsLayout.x,
      vsLayout.y + vsLayout.height,
    );
    vsGrad.addColorStop(0, "#fbbf24");
    vsGrad.addColorStop(0.5, "#f97316");
    vsGrad.addColorStop(1, "#dc2626");
    ctx.fillStyle = vsGrad;
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(vsLayout.x, vsLayout.y, vsLayout.width, vsLayout.height, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 13px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VS", vsLayout.x + vsLayout.width / 2, vsLayout.y + vsLayout.height / 2 + 4.5);
    ctx.restore();

    // --- 3. Right Tank Bar (Player 2: Orange-to-Red) ---
    if (p2) {
      const p2Layout = layout.p2;
      const isActiveP2 = p2.alive && p2.playerId === activePlayerId;
      const ratioP2 = Math.max(0, Math.min(1, p2.health / p2.maxHealth));

      ctx.save();
      if (isActiveP2) {
        ctx.shadowColor = "#f97316";
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
      ctx.strokeStyle = isActiveP2 ? "#f97316" : "rgba(249, 115, 22, 0.35)";
      ctx.lineWidth = isActiveP2 ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(p2Layout.x, p2Layout.y, p2Layout.width, p2Layout.height, 8);
      ctx.fill();
      ctx.stroke();

      // P2 Health Fill
      const barPadding = 4;
      const barX = p2Layout.x + barPadding;
      const barY = p2Layout.y + 19;
      const barW = p2Layout.width - barPadding * 2;
      const barH = 12;

      // Track
      ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 4);
      ctx.fill();

      // Progress Gradient (fills from right side or left side)
      const fillW = barW * ratioP2;
      if (fillW > 0) {
        const fillStartX = barX + (barW - fillW);
        const p2Grad = ctx.createLinearGradient(fillStartX, barY, barX + barW, barY);
        p2Grad.addColorStop(0, "#ea580c");
        p2Grad.addColorStop(0.5, "#f97316");
        p2Grad.addColorStop(1, "#ef4444");
        ctx.fillStyle = p2Grad;
        ctx.beginPath();
        ctx.roundRect(fillStartX, barY, fillW, barH, 4);
        ctx.fill();
      }

      // Player 2 Name & HP
      ctx.fillStyle = p2.alive ? "#f97316" : "#ef4444";
      ctx.beginPath();
      ctx.arc(p2Layout.x + p2Layout.width - 12, p2Layout.y + 11, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        p2.displayName || "Player 2",
        p2Layout.x + p2Layout.width - 22,
        p2Layout.y + 14,
      );

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "700 10px 'Share Tech Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${Math.ceil(p2.health)}/${p2.maxHealth}`, p2Layout.x + 8, p2Layout.y + 14);
      ctx.restore();
    }
  }

  private drawCentralTelemetryCapsule(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    const layout = getCentralTelemetryLayout(this.gameViewport.width);

    // Pill Background
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(layout.x, layout.y, layout.width, layout.height, layout.height / 2);
    ctx.fill();
    ctx.stroke();

    // 1. Match Clock (Left)
    const matchTimeRemaining = gameState.match.matchTimeRemaining ?? 180;
    const matchMin = Math.floor(matchTimeRemaining / 60);
    const matchSec = Math.floor(matchTimeRemaining % 60);
    const clockStr = `${String(matchMin).padStart(2, "0")}:${String(matchSec).padStart(2, "0")}`;

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 11px 'Share Tech Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`⏱ ${clockStr}`, layout.x + 14, layout.y + layout.height / 2 + 4);

    // 2. Radial Turn Timer Ring (Center)
    const ringCenterX = layout.x + layout.width / 2;
    const ringCenterY = layout.y + layout.height / 2;
    const ringRadius = 9;
    const turnSeconds = Math.max(0, gameState.match.turnTimeRemaining);
    const maxTurnSeconds = 30;
    const turnRatio = Math.min(1, turnSeconds / maxTurnSeconds);
    const isWarning = turnSeconds <= 5;

    // Background track ring
    ctx.beginPath();
    ctx.arc(ringCenterX, ringCenterY, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Draining progress arc
    if (turnRatio > 0) {
      ctx.beginPath();
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * turnRatio;
      ctx.arc(ringCenterX, ringCenterY, ringRadius, startAngle, endAngle);
      if (isWarning) {
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 8;
        ctx.strokeStyle = "#ef4444";
      } else {
        ctx.strokeStyle = "#00f0ff";
      }
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Timer seconds text inside ring
    ctx.fillStyle = isWarning ? "#ef4444" : "#ffffff";
    ctx.font = "800 8px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.ceil(turnSeconds)}`, ringCenterX, ringCenterY + 3);

    // 3. Wind indicator (Right)
    const wind = gameState.match.wind ?? 0;
    const windArrow = wind >= 0 ? "➔" : "←";
    const windStr = `༄ ${windArrow} ${Math.abs(wind).toFixed(1)} mph`;

    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 10.5px 'Share Tech Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(windStr, layout.x + layout.width - 14, layout.y + layout.height / 2 + 4);

    ctx.restore();
  }

  private drawRelockCameraButton(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (gameState.match.isCameraLocked !== false) return;

    const isRelockHovered = this.hoverTarget?.type === "relockCamera";
    ctx.save();
    const relockX = this.gameViewport.width / 2 - 65 - (isRelockHovered ? 2 : 0);
    const relockY = 88 - (isRelockHovered ? 2 : 0);
    const relockW = 130 + (isRelockHovered ? 4 : 0);
    const relockH = 28 + (isRelockHovered ? 4 : 0);

    if (isRelockHovered) {
      ctx.shadowColor = "#ebc80e";
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = isRelockHovered ? "rgba(30, 41, 59, 0.98)" : "rgba(15, 23, 42, 0.92)";
    ctx.strokeStyle = isRelockHovered ? "#fef08a" : "#ebc80e";
    ctx.lineWidth = isRelockHovered ? 2.5 : 1.8;
    ctx.beginPath();
    ctx.roundRect(relockX, relockY, relockW, relockH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isRelockHovered ? "#fef08a" : "#ebc80e";
    ctx.font = isRelockHovered ? "800 11px Inter, sans-serif" : "700 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔒 RELOCK CAMERA", this.gameViewport.width / 2, relockY + (isRelockHovered ? 19 : 18));
    ctx.restore();
  }

  private drawFuelGauge(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    const activeTank = gameState.tanks.find(
      (entry) =>
        entry.playerId === gameState.match.activePlayerId &&
        entry.alive &&
        entry.controllerKind !== "remote",
    );
    if (!activeTank || gameState.match.phase !== "thinking") return;

    const layout = getFuelGaugeLayout(
      this.gameViewport.width,
      this.gameViewport.height,
    );
    const fuel = activeTank.fuel ?? 0;
    const maxFuel = 100;
    const ratio = Math.max(0, Math.min(1, fuel / maxFuel));

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(layout.x, layout.y, layout.width, layout.height, layout.height / 2);
    ctx.fill();
    ctx.stroke();

    // Fuel Label
    ctx.fillStyle = "#f59e0b";
    ctx.font = "800 10px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("FUEL", layout.x + 10, layout.y + layout.height / 2 + 3.5);

    // Fuel Bar Track
    const barX = layout.x + 42;
    const barY = layout.y + 7;
    const barW = layout.width - 50;
    const barH = layout.height - 14;

    ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    // Fuel Fill
    const fillW = barW * ratio;
    if (fillW > 0) {
      const fuelGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
      fuelGrad.addColorStop(0, "#f59e0b");
      fuelGrad.addColorStop(1, "#fde047");
      ctx.fillStyle = fuelGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 4);
      ctx.fill();
    }

    // Numeric Fuel Overlay
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 9px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.ceil(fuel)}`, barX + barW / 2, barY + barH / 2 + 3);

    ctx.restore();
  }

  private drawPowerAngleReadout(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (gameState.match.phase !== "thinking") {
      return;
    }

    const activeTank = gameState.tanks.find(
      (entry) =>
        entry.playerId === gameState.match.activePlayerId &&
        entry.alive &&
        entry.controllerKind !== "remote",
    );
    if (!activeTank) return;

    const screenX = activeTank.position.x - this.cameraX;
    const groupHalfWidth = 78;
    const clampedCenterX = Math.max(
      groupHalfWidth + 12,
      Math.min(this.gameViewport.width - groupHalfWidth - 12, screenX),
    );
    const bubbleY = Math.max(
      96,
      Math.min(this.gameViewport.height - 80, activeTank.position.y - 120),
    );
    const maxPower = ResourceManager.getInstance().isLoaded()
      ? (ResourceManager.getInstance().getGameContent().validation?.maxFirePower ?? DEFAULT_MAX_AIM_POWER)
      : DEFAULT_MAX_AIM_POWER;
    const power = Math.round((activeTank.power / maxPower) * 100);
    const angle = Math.round(Math.abs((activeTank.aimAngle * 180) / Math.PI));

    this.drawMetricBubble(ctx, clampedCenterX - 42, bubbleY, `${power}`, "POWER");
    this.drawMetricBubble(ctx, clampedCenterX + 42, bubbleY, `${angle}`, "ANGLE");
  }

  private drawMetricBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    value: string,
    label: string,
  ): void {
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - 34, y - 24, 68, 48, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 16px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(value, x, y - 3);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 8px Inter, sans-serif";
    ctx.fillText(label, x, y + 11);
    ctx.textAlign = "start";
  }

  private drawCompactWeaponSelector(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (gameState.match.phase !== "thinking") return;

    const activeTank = gameState.tanks.find(
      (entry) =>
        entry.playerId === gameState.match.activePlayerId &&
        entry.alive &&
        entry.controllerKind !== "remote",
    );
    if (!activeTank) return;

    const layout = getCompactWeaponSelectorLayout(
      this.gameViewport.width,
      this.gameViewport.height,
    );
    const selectedSlotId =
      activeTank.selectedProjectileSlotId || activeTank.loadout[0];
    const projDef = selectedSlotId
      ? gameState.projectileDefinitions[selectedSlotId]
      : null;
    const label = projDef ? projDef.label : selectedSlotId || "Standard";
    const ammo =
      selectedSlotId && activeTank.weaponAmmo[selectedSlotId] !== undefined
        ? activeTank.weaponAmmo[selectedSlotId]
        : 0;
    const isHovered =
      this.hoverTarget?.type === "weaponSlot" ||
      (this.hoverTarget?.type === "slot" &&
        this.hoverTarget.slotId === selectedSlotId);
    const isOpen = this.isWeaponDrawerOpen;

    ctx.save();
    if (isHovered || isOpen) {
      ctx.shadowColor = "#8b5cf6";
      ctx.shadowBlur = 14;
    }

    ctx.fillStyle = isOpen
      ? "rgba(30, 41, 59, 0.98)"
      : isHovered
      ? "rgba(30, 41, 59, 0.95)"
      : "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = isOpen
      ? "#facc15"
      : isHovered
      ? "#38bdf8"
      : "#8b5cf6";
    ctx.lineWidth = isOpen || isHovered ? 2.5 : 1.8;
    ctx.beginPath();
    ctx.roundRect(layout.x, layout.y, layout.size, layout.size, 12);
    ctx.fill();
    ctx.stroke();

    // Weapon Label
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 10.5px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, layout.x + layout.size / 2, layout.y + 16);

    // Ammo Badge Chip (top-right)
    const ammoText = ammo === -1 ? "∞" : `${ammo}`;
    ctx.fillStyle = ammo === 0 ? "#ef4444" : "#3b82f6";
    ctx.beginPath();
    ctx.roundRect(layout.x + layout.size - 22, layout.y + 4, 18, 12, 4);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 8px Inter, sans-serif";
    ctx.fillText(ammoText, layout.x + layout.size - 13, layout.y + 13);

    // Cycle Icon [ ⇄ ]
    ctx.fillStyle = isOpen ? "#facc15" : "#a78bfa";
    ctx.font = "700 13px Inter, sans-serif";
    ctx.fillText("⇄", layout.x + layout.size / 2, layout.y + 34);

    // Hotkey reminder
    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 8.5px Inter, sans-serif";
    ctx.fillText("[1-5]", layout.x + layout.size / 2, layout.y + layout.size - 6);

    ctx.restore();
  }

  private drawExpandedWeaponDrawer(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (!this.isWeaponDrawerOpen || gameState.match.phase !== "thinking") return;

    const activeTank = gameState.tanks.find(
      (entry) =>
        entry.playerId === gameState.match.activePlayerId &&
        entry.alive &&
        entry.controllerKind !== "remote",
    );
    if (!activeTank) return;

    const drawerLayout = getExpandedWeaponDrawerLayout(
      this.gameViewport.width,
      this.gameViewport.height,
      activeTank.loadout.length,
    );

    ctx.save();
    // Drawer Container
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
    ctx.strokeStyle = "rgba(139, 92, 246, 0.6)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(
      drawerLayout.x,
      drawerLayout.y,
      drawerLayout.width,
      drawerLayout.height,
      12,
    );
    ctx.fill();
    ctx.stroke();

    // Drawer Items
    for (const item of drawerLayout.items) {
      const slotId = activeTank.loadout[item.slotIndex];
      if (!slotId) continue;

      const projDef = gameState.projectileDefinitions[slotId];
      const isSelected = slotId === activeTank.selectedProjectileSlotId;
      const isHovered =
        this.hoverTarget?.type === "drawerSlot" &&
        this.hoverTarget.slotId === slotId;
      const ammo = activeTank.weaponAmmo[slotId] ?? 0;
      const isDepleted = ammo === 0;

      ctx.fillStyle = isSelected
        ? "rgba(250, 204, 21, 0.18)"
        : isHovered
        ? "rgba(56, 189, 248, 0.16)"
        : "rgba(30, 41, 59, 0.65)";
      ctx.strokeStyle = isSelected
        ? "#facc15"
        : isHovered
        ? "#38bdf8"
        : "rgba(148, 163, 184, 0.22)";
      ctx.lineWidth = isSelected || isHovered ? 1.8 : 1;
      ctx.beginPath();
      ctx.roundRect(item.x, item.y, item.width, item.height, 7);
      ctx.fill();
      ctx.stroke();

      // Hotkey Chip [1]
      ctx.fillStyle = "#64748b";
      ctx.font = "800 9px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`[${item.slotIndex + 1}]`, item.x + 8, item.y + item.height / 2 + 3.5);

      // Weapon Label
      const label = projDef ? projDef.label : slotId;
      ctx.fillStyle = isDepleted
        ? "#64748b"
        : isSelected
        ? "#fef08a"
        : "#f8fafc";
      ctx.font = "700 11px Inter, sans-serif";
      ctx.fillText(label, item.x + 28, item.y + item.height / 2 + 3.5);

      // Ammo Badge
      const ammoText = ammo === -1 ? "∞" : `${ammo}`;
      ctx.fillStyle = isDepleted
        ? "#64748b"
        : isSelected
        ? "#facc15"
        : "#38bdf8";
      ctx.font = "800 10px 'Share Tech Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(ammoText, item.x + item.width - 8, item.y + item.height / 2 + 3.5);
    }

    ctx.restore();
  }

  private drawFireButton(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (gameState.match.phase !== "thinking") return;

    const activeTank = gameState.tanks.find(
      (entry) =>
        entry.playerId === gameState.match.activePlayerId &&
        entry.alive &&
        entry.controllerKind !== "remote",
    );
    if (!activeTank) return;

    const layout = getFireButtonLayout(
      this.gameViewport.width,
      this.gameViewport.height,
    );
    const currentSlotId =
      activeTank.selectedProjectileSlotId || activeTank.loadout[0];
    const currentAmmo =
      currentSlotId && activeTank.weaponAmmo[currentSlotId] !== undefined
        ? activeTank.weaponAmmo[currentSlotId]
        : 0;
    const canFire = currentAmmo !== 0;
    const isFireHovered = this.hoverTarget?.type === "fire";

    const fireX = layout.x - (isFireHovered && canFire ? 2 : 0);
    const fireY = layout.y - (isFireHovered && canFire ? 2 : 0);
    const fireW = layout.width + (isFireHovered && canFire ? 4 : 0);
    const fireH = layout.height + (isFireHovered && canFire ? 4 : 0);

    ctx.save();
    if (isFireHovered && canFire) {
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 20;
    }

    const fireGrad = ctx.createLinearGradient(fireX, fireY, fireX, fireY + fireH);
    if (isFireHovered && canFire) {
      fireGrad.addColorStop(0, "#f97316");
      fireGrad.addColorStop(0.5, "#ef4444");
      fireGrad.addColorStop(1, "#b91c1c");
    } else {
      fireGrad.addColorStop(0, canFire ? "#ef4444" : "#475569");
      fireGrad.addColorStop(1, canFire ? "#991b1b" : "#1e293b");
    }
    ctx.fillStyle = fireGrad;
    ctx.strokeStyle = canFire
      ? isFireHovered
        ? "#fef08a"
        : "#f87171"
      : "#64748b";
    ctx.lineWidth = isFireHovered && canFire ? 2.5 : 1.8;
    ctx.beginPath();
    ctx.roundRect(fireX, fireY, fireW, fireH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = canFire ? "#ffffff" : "#94a3b8";
    ctx.font =
      isFireHovered && canFire
        ? "900 14px Orbitron, sans-serif"
        : "800 13px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FIRE", fireX + fireW / 2, fireY + fireH / 2 + 1);

    ctx.font = "700 9px Inter, sans-serif";
    ctx.fillStyle = canFire ? (isFireHovered ? "#ffffff" : "#fca5a5") : "#64748b";
    ctx.fillText("[Space]", fireX + fireW / 2, fireY + fireH - 6);
    ctx.restore();
  }

  private drawMobileControls(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (this.gameViewport.width >= 768 || gameState.match.phase !== "thinking") return;

    const activeTank = gameState.tanks.find(
      (entry) =>
        entry.playerId === gameState.match.activePlayerId &&
        entry.alive &&
        entry.controllerKind !== "remote",
    );
    if (!activeTank) return;

    const touchLayout = getVirtualTouchControlsLayout(
      this.gameViewport.width,
      this.gameViewport.height,
    );

    // 1. Virtual D-pad (Bottom-Left)
    const dpad = touchLayout.dpad;
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(dpad.centerX, dpad.centerY, dpad.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left arrow
    const isLeftHovered = this.hoverTarget?.type === "dpadLeft";
    ctx.fillStyle = isLeftHovered ? "#38bdf8" : "rgba(255, 255, 255, 0.75)";
    ctx.font = "900 18px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("◀", dpad.centerX - 20, dpad.centerY + 6);

    // Right arrow
    const isRightHovered = this.hoverTarget?.type === "dpadRight";
    ctx.fillStyle = isRightHovered ? "#38bdf8" : "rgba(255, 255, 255, 0.75)";
    ctx.fillText("▶", dpad.centerX + 20, dpad.centerY + 6);

    // Center divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(dpad.centerX, dpad.centerY - dpad.radius + 6);
    ctx.lineTo(dpad.centerX, dpad.centerY + dpad.radius - 6);
    ctx.stroke();

    // 2. Virtual Aim Dial (Bottom-Right)
    const dial = touchLayout.aimWheel;
    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(dial.centerX, dial.centerY, dial.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dial angle ticks
    for (let deg = 0; deg <= 180; deg += 45) {
      const rad = (-deg * Math.PI) / 180;
      const tx1 = dial.centerX + Math.cos(rad) * (dial.radius - 8);
      const ty1 = dial.centerY + Math.sin(rad) * (dial.radius - 8);
      const tx2 = dial.centerX + Math.cos(rad) * dial.radius;
      const ty2 = dial.centerY + Math.sin(rad) * dial.radius;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();
    }

    // Aim Pointer Needle
    const aimRad = activeTank.aimAngle;
    const nx = dial.centerX + Math.cos(aimRad) * (dial.radius - 6);
    const ny = dial.centerY + Math.sin(aimRad) * (dial.radius - 6);
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(dial.centerX, dial.centerY);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    // Center Pivot
    ctx.fillStyle = "#00f0ff";
    ctx.beginPath();
    ctx.arc(dial.centerX, dial.centerY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawGameOverBanner(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (gameState.match.phase !== "gameOver") return;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.76)";
    ctx.fillRect(0, 0, this.gameViewport.width, this.gameViewport.height);
    ctx.fillStyle = "#ebc80e";
    ctx.font = "700 36px Orbitron, sans-serif";
    ctx.textAlign = "center";

    const winnerText =
      gameState.match.winnerPlayerId !== null
        ? `PLAYER ${gameState.match.winnerPlayerId + 1} WINS!`
        : `DRAW! MATCH TIME EXPIRED`;

    ctx.fillText(
      winnerText,
      this.gameViewport.width / 2,
      this.gameViewport.height / 2,
    );
    ctx.restore();
  }
}
