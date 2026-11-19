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
      {
        name: "hazardVignettes",
        draw: (ctx, gameState) => this.drawHazardVignettes(ctx, gameState),
      },
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
          lastEvent.animationId === "cyan-beam");
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

      // Barrel & Turret
      const rad = entry.aimAngle;
      const barrelLength = entry.barrelLength ?? 28;
      const turretYOffset = entry.turretYOffset ?? -14;
      const muzzleX = Math.cos(rad) * barrelLength;
      const muzzleY = turretYOffset + Math.sin(rad) * barrelLength;

      const tankId = entry.tankDefinitionId;
      if (tankId === "ignis") {
        this.drawIgnisTank(ctx, entry, rad, turretYOffset, muzzleX, muzzleY);
      } else if (tankId === "glacies") {
        this.drawGlaciesTank(ctx, entry, rad, turretYOffset, muzzleX, muzzleY);
      } else if (tankId === "terra") {
        this.drawTerraTank(ctx, entry, rad, turretYOffset, muzzleX, muzzleY);
      } else if (tankId === "volt") {
        this.drawVoltTank(ctx, entry, rad, turretYOffset, muzzleX, muzzleY);
      } else {
        this.drawGenericTank(ctx, entry, mainColor, strokeColor, accentColor, turretYOffset, muzzleX, muzzleY);
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

  private drawIgnisTank(
    ctx: CanvasRenderingContext2D,
    _entry: GameState["tanks"][number],
    rad: number,
    turretYOffset: number,
    muzzleX: number,
    muzzleY: number,
  ): void {
    // Dual Exhaust Pipes with glowing flame particles
    ctx.save();
    ctx.translate(-14, -14);
    ctx.rotate((-20 * Math.PI) / 180);
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#71717a";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(-2, -4, 3.5, 7, 1);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-2, -5, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = "#f97316";
    ctx.fill();
    ctx.restore();

    // Turret Barrel (Magma Napalm Cannon)
    ctx.beginPath();
    ctx.moveTo(0, turretYOffset);
    ctx.lineTo(muzzleX, muzzleY);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#ef4444";
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(Math.cos(rad) * 4, turretYOffset + Math.sin(rad) * 4);
    ctx.lineTo(Math.cos(rad) * 22, turretYOffset + Math.sin(rad) * 22);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#facc15";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(muzzleX, muzzleY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Tank Body (Basalt Magma Alloy)
    ctx.beginPath();
    ctx.roundRect(-18, -14, 36, 14, 4);
    const bodyGrad = ctx.createLinearGradient(0, -14, 0, 0);
    bodyGrad.addColorStop(0, "#ef4444");
    bodyGrad.addColorStop(1, "#991b1b");
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = "#f87171";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Heat Vent Lines
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.lineTo(-3, -9);
    ctx.lineTo(6, -6);
    ctx.lineTo(14, -8);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Treads & Wheels
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
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(wx, 8, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "#facc15";
      ctx.fill();
    }
  }

  private drawGlaciesTank(
    ctx: CanvasRenderingContext2D,
    _entry: GameState["tanks"][number],
    rad: number,
    turretYOffset: number,
    muzzleX: number,
    muzzleY: number,
  ): void {
    // Rear Ice Crystal Fin
    ctx.beginPath();
    ctx.moveTo(-16, -10);
    ctx.lineTo(-22, -18);
    ctx.lineTo(-12, -14);
    ctx.closePath();
    ctx.fillStyle = "#bae6fd";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 0.8;
    ctx.fill();
    ctx.stroke();

    // Turret Cryo Lance Barrel
    ctx.beginPath();
    ctx.moveTo(0, turretYOffset);
    ctx.lineTo(muzzleX, muzzleY);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = "#0284c7";
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(Math.cos(rad) * 4, turretYOffset + Math.sin(rad) * 4);
    ctx.lineTo(Math.cos(rad) * 22, turretYOffset + Math.sin(rad) * 22);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#bae6fd";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(muzzleX, muzzleY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Tank Body (Crystalline Ice Plating)
    ctx.beginPath();
    ctx.roundRect(-18, -14, 36, 14, 4);
    const bodyGrad = ctx.createLinearGradient(0, -14, 0, 0);
    bodyGrad.addColorStop(0, "#38bdf8");
    bodyGrad.addColorStop(1, "#0284c7");
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Facet Highlight
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.lineTo(0, -11);
    ctx.lineTo(12, -7);
    ctx.lineTo(0, -3);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fill();
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Treads & Wheels
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.roundRect(-22, 2, 44, 12, 3);
    ctx.fill();
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let wx = -15; wx <= 15; wx += 10) {
      ctx.beginPath();
      ctx.arc(wx, 8, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#0c4a6e";
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(wx, 8, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
  }

  private drawTerraTank(
    ctx: CanvasRenderingContext2D,
    _entry: GameState["tanks"][number],
    rad: number,
    turretYOffset: number,
    muzzleX: number,
    muzzleY: number,
  ): void {
    // Heavy Hydraulic Arm Brace (Rear)
    ctx.save();
    ctx.translate(-15, -13);
    ctx.rotate((25 * Math.PI) / 180);
    ctx.fillStyle = "#451a03";
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(-2, -4, 4, 8, 1);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Reinforced Mortar Barrel
    ctx.beginPath();
    ctx.moveTo(0, turretYOffset);
    ctx.lineTo(muzzleX, muzzleY);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#78350f";
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(Math.cos(rad) * 3, turretYOffset + Math.sin(rad) * 3);
    ctx.lineTo(Math.cos(rad) * 23, turretYOffset + Math.sin(rad) * 23);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#f59e0b";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(muzzleX, muzzleY, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = "#fde68a";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    // Tank Body with Industrial Hazard Plate
    ctx.beginPath();
    ctx.roundRect(-18, -14, 36, 14, 4);
    const bodyGrad = ctx.createLinearGradient(0, -14, 0, 0);
    bodyGrad.addColorStop(0, "#d97706");
    bodyGrad.addColorStop(1, "#78350f");
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Hazard Stripes Inset
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.roundRect(-10, -10, 20, 6, 1.5);
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -10); ctx.lineTo(-3, -4);
    ctx.moveTo(0, -10); ctx.lineTo(3, -4);
    ctx.moveTo(6, -10); ctx.lineTo(9, -4);
    ctx.stroke();

    // Heavy-Duty Treads
    ctx.fillStyle = "#1c1917";
    ctx.beginPath();
    ctx.roundRect(-22, 2, 44, 12, 3);
    ctx.fill();
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let wx = -15; wx <= 15; wx += 10) {
      ctx.beginPath();
      ctx.arc(wx, 8, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#292524";
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(wx, 8, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "#fde68a";
      ctx.fill();
    }
  }

  private drawVoltTank(
    ctx: CanvasRenderingContext2D,
    _entry: GameState["tanks"][number],
    rad: number,
    turretYOffset: number,
    muzzleX: number,
    muzzleY: number,
  ): void {
    // Rear Tesla Prongs with Cyan Tips
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-16, -8); ctx.lineTo(-20, -16);
    ctx.moveTo(-11, -10); ctx.lineTo(-14, -18);
    ctx.stroke();

    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.arc(-20, -16, 1.5, 0, Math.PI * 2);
    ctx.arc(-14, -18, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Dual Railgun / Tesla Barrel
    ctx.beginPath();
    ctx.moveTo(0, turretYOffset);
    ctx.lineTo(muzzleX, muzzleY);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = "#581c87";
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(Math.cos(rad) * 3, turretYOffset + Math.sin(rad) * 3);
    ctx.lineTo(Math.cos(rad) * 23, turretYOffset + Math.sin(rad) * 23);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#06b6d4";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(muzzleX, muzzleY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(muzzleX, muzzleY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "#67e8f9";
    ctx.fill();

    // Tank Body (Electromagnetic Hull)
    ctx.beginPath();
    ctx.roundRect(-18, -14, 36, 14, 4);
    const bodyGrad = ctx.createLinearGradient(0, -14, 0, 0);
    bodyGrad.addColorStop(0, "#a855f7");
    bodyGrad.addColorStop(1, "#581c87");
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Central Arc Reactor Core
    ctx.beginPath();
    ctx.arc(0, -7, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#090514";
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -7, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = "#06b6d4";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -7, 0.8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Mag-Lev / High-Tech Treads Base
    ctx.fillStyle = "#090514";
    ctx.beginPath();
    ctx.roundRect(-22, 2, 44, 12, 3);
    ctx.fill();
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let wx = -15; wx <= 15; wx += 10) {
      ctx.beginPath();
      ctx.arc(wx, 8, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#1e1035";
      ctx.fill();
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(wx, 8, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "#67e8f9";
      ctx.fill();
    }
  }

  private drawGenericTank(
    ctx: CanvasRenderingContext2D,
    _entry: GameState["tanks"][number],
    mainColor: string,
    strokeColor: string,
    accentColor: string,
    turretYOffset: number,
    muzzleX: number,
    muzzleY: number,
  ): void {
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
      this.drawElementalProjectile(ctx, entry.projectileDefinitionId, radius);

      ctx.restore();
    }

    // Draw active Damage Trail hazard zones
    if (gameState.damageTrails) {
      this.drawDamageTrails(ctx, gameState.damageTrails, gameState.terrain);
    }
  }

  private drawElementalProjectile(
    ctx: CanvasRenderingContext2D,
    projId: string,
    radius: number,
  ): void {
    switch (projId) {
      // 1. Universal Standard Kaboom
      case "standardKaboom": {
        ctx.beginPath();
        ctx.moveTo(-radius * 2.8, 0);
        ctx.lineTo(0, -radius * 0.9);
        ctx.lineTo(0, radius * 0.9);
        ctx.closePath();
        ctx.fillStyle = "rgba(245, 158, 11, 0.65)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#475569";
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-radius * 0.3, 0, radius * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      // 2. Ignis - Magma Salvo
      case "magmaSalvo":
      case "magmaMortar": {
        ctx.beginPath();
        ctx.moveTo(-radius * 2.5, 0);
        ctx.lineTo(0, -radius * 0.8);
        ctx.lineTo(radius * 1.2, 0);
        ctx.lineTo(0, radius * 0.8);
        ctx.closePath();
        ctx.fillStyle = "rgba(249, 115, 22, 0.75)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 1, 0, 0, radius);
        grad.addColorStop(0, "#fef08a");
        grad.addColorStop(0.5, "#f97316");
        grad.addColorStop(1, "#18181b");
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      // 3. Ignis - Blaze Cluster & Shards
      case "blazeCluster":
      case "blazeCluster_shard": {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#f97316";
        ctx.fill();
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        break;
      }

      // 4. Ignis - Dragon's Breath
      case "dragonsBreath": {
        ctx.beginPath();
        ctx.moveTo(-radius * 3.5, 0);
        ctx.lineTo(-radius * 0.5, -radius * 1.1);
        ctx.lineTo(radius * 0.8, 0);
        ctx.lineTo(-radius * 0.5, radius * 1.1);
        ctx.closePath();
        const fireGrad = ctx.createLinearGradient(-radius * 3, 0, radius, 0);
        fireGrad.addColorStop(0, "rgba(239, 68, 68, 0)");
        fireGrad.addColorStop(0.5, "#f97316");
        fireGrad.addColorStop(1, "#ffffff");
        ctx.fillStyle = fireGrad;
        ctx.fill();
        break;
      }

      // 5. Ignis - Lava Hopper
      case "lavaHopper": {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#f97316";
        ctx.fill();
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }

      // Ignis - Pyroclast Cataclysm (legacy support)
      case "pyroclastCataclysm": {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(249, 115, 22, 0.35)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#18181b";
        ctx.fill();
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-radius * 0.6, -radius * 0.3);
        ctx.lineTo(0, 0);
        ctx.lineTo(radius * 0.5, -radius * 0.5);
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      // 6. Glacies - Cryo Needle
      case "cryoNeedle": {
        ctx.beginPath();
        ctx.moveTo(-radius * 4, 0);
        ctx.lineTo(radius * 2, -1.5);
        ctx.lineTo(radius * 2, 1.5);
        ctx.closePath();
        ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(radius * 3, 0);
        ctx.lineTo(-radius, -2);
        ctx.lineTo(-radius, 2);
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        break;
      }

      // Glacies - Blizzard Salvo
      case "blizzardSalvo": {
        ctx.beginPath();
        ctx.moveTo(-radius * 2.5, 0);
        ctx.lineTo(0, -radius * 0.7);
        ctx.lineTo(radius * 1.5, 0);
        ctx.lineTo(0, radius * 0.7);
        ctx.closePath();
        ctx.fillStyle = "#0284c7";
        ctx.strokeStyle = "#e0f2fe";
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        break;
      }

      // Glacies - Apex Avalanche & Shards
      case "apexAvalanche":
      case "apexAvalanche_shard": {
        ctx.beginPath();
        ctx.moveTo(radius * 1.5, 0);
        ctx.lineTo(0, -radius);
        ctx.lineTo(-radius, 0);
        ctx.lineTo(0, radius);
        ctx.closePath();
        ctx.fillStyle = "#bae6fd";
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();
        break;
      }

      // Glacies - Frostbite Zone
      case "frostbiteZone": {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
        ctx.strokeStyle = "#bae6fd";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-radius * 0.7, 0); ctx.lineTo(radius * 0.7, 0);
        ctx.moveTo(0, -radius * 0.7); ctx.lineTo(0, radius * 0.7);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }

      // Glacies - Glacial Shatter (legacy support)
      case "glacialShatter": {
        ctx.beginPath();
        ctx.moveTo(radius * 1.2, -radius * 0.4);
        ctx.lineTo(radius * 0.6, -radius);
        ctx.lineTo(-radius * 0.8, -radius * 0.6);
        ctx.lineTo(-radius, radius * 0.5);
        ctx.lineTo(0, radius * 1.1);
        ctx.closePath();
        ctx.fillStyle = "#0284c7";
        ctx.strokeStyle = "#bae6fd";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        break;
      }

      // Terra - Gravel Gatling
      case "gravelGatling": {
        ctx.beginPath();
        ctx.moveTo(-radius * 2, 0);
        ctx.lineTo(0, -radius * 0.7);
        ctx.lineTo(radius * 1.2, 0);
        ctx.lineTo(0, radius * 0.7);
        ctx.closePath();
        ctx.fillStyle = "#d97706";
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        break;
      }

      // Terra - Granite Cluster & Shards
      case "graniteCluster":
      case "graniteCluster_shard": {
        ctx.beginPath();
        ctx.moveTo(radius * 1.2, -radius * 0.6);
        ctx.lineTo(radius * 0.8, radius * 0.8);
        ctx.lineTo(-radius * 0.6, radius * 1.1);
        ctx.lineTo(-radius * 1.1, -radius * 0.3);
        ctx.lineTo(0, -radius * 1.1);
        ctx.closePath();
        ctx.fillStyle = "#78350f";
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();
        break;
      }

      // Terra - Tectonic Thumper
      case "tectonicThumper": {
        ctx.beginPath();
        ctx.rect(-radius, -radius * 0.8, radius * 2, radius * 1.6);
        ctx.fillStyle = "#78350f";
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(radius, 0, radius * 0.8, -Math.PI / 2, Math.PI / 2);
        ctx.fillStyle = "#d97706";
        ctx.fill();
        break;
      }

      // Terra - Sinkhole Drill (legacy support)
      case "sinkholeDrill": {
        ctx.beginPath();
        ctx.moveTo(radius * 2, 0);
        ctx.lineTo(-radius, -radius);
        ctx.lineTo(-radius * 0.5, 0);
        ctx.lineTo(-radius, radius);
        ctx.closePath();
        ctx.fillStyle = "#f59e0b";
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();
        break;
      }

      // 13. Terra - Quake Fissure
      case "quakeFissure": {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#d97706";
        ctx.fill();
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      // 14. Volt - Arc Salvo
      case "arcSalvo": {
        ctx.beginPath();
        ctx.moveTo(radius * 1.8, 0);
        ctx.lineTo(-radius * 0.8, -radius * 0.8);
        ctx.lineTo(-radius * 0.4, 0);
        ctx.lineTo(-radius * 0.8, radius * 0.8);
        ctx.closePath();
        ctx.fillStyle = "#a855f7";
        ctx.strokeStyle = "#67e8f9";
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();
        break;
      }

      // 15. Volt - Static Apex Star & Shards
      case "staticApexStar":
      case "staticApexStar_shard": {
        ctx.beginPath();
        ctx.moveTo(0, -radius * 1.5);
        ctx.lineTo(radius * 0.4, -radius * 0.4);
        ctx.lineTo(radius * 1.5, 0);
        ctx.lineTo(radius * 0.4, radius * 0.4);
        ctx.lineTo(0, radius * 1.5);
        ctx.lineTo(-radius * 0.4, radius * 0.4);
        ctx.lineTo(-radius * 1.5, 0);
        ctx.lineTo(-radius * 0.4, -radius * 0.4);
        ctx.closePath();
        ctx.fillStyle = "#67e8f9";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        break;
      }

      // 16. Volt - Tesla Grid
      case "teslaGrid": {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#581c87";
        ctx.fill();
        ctx.strokeStyle = "#67e8f9";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        break;
      }

      // 17. Volt - Thunderstrike Core
      case "thunderstrikeCore": {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(103, 232, 249, 0.4)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#a855f7";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        break;
      }

      default: {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }
    }
  }

  private drawDamageTrails(
    ctx: CanvasRenderingContext2D,
    damageTrails: GameState["damageTrails"],
    terrain: GameState["terrain"],
  ): void {
    if (!damageTrails || damageTrails.length === 0) return;
    const now = Date.now();

    for (const trail of damageTrails) {
      const type = trail.hazardType;
      const cx = trail.position.x;
      const rad = trail.radius;
      const surface = terrain?.surface;
      if (!surface) continue;
      const minX = Math.max(0, Math.floor(cx - rad));
      const maxX = Math.min(surface.length - 1, Math.ceil(cx + rad));

      ctx.save();

      if (type === "FIRE") {
        // 1. Burning fire flames rising from the ground
        const step = 4;
        for (let x = minX; x <= maxX; x += step) {
          const dist = Math.abs(x - cx);
          const factor = Math.max(0, 1 - dist / rad);
          const groundY = surface[x] ?? trail.position.y;
          const anim = Math.sin(now * 0.01 + x * 0.15) * 0.5 + 0.5;
          const anim2 = Math.cos(now * 0.015 + x * 0.22) * 0.5 + 0.5;
          const flameH = (12 + anim * 14 + anim2 * 8) * factor;

          // Outer flame tongue
          ctx.beginPath();
          ctx.moveTo(x - step * 0.8, groundY);
          ctx.quadraticCurveTo(x, groundY - flameH * 1.1, x + (anim - 0.5) * 6, groundY - flameH);
          ctx.quadraticCurveTo(x + step * 0.8, groundY - flameH * 0.5, x + step * 0.8, groundY);
          ctx.closePath();
          ctx.fillStyle = `rgba(239, 68, 68, ${0.75 * factor + 0.2})`;
          ctx.fill();

          // Inner hotter core
          if (flameH > 6) {
            ctx.beginPath();
            ctx.moveTo(x - step * 0.4, groundY);
            ctx.quadraticCurveTo(x, groundY - flameH * 0.7, x, groundY - flameH * 0.65);
            ctx.quadraticCurveTo(x + step * 0.4, groundY - flameH * 0.35, x + step * 0.4, groundY);
            ctx.closePath();
            ctx.fillStyle = `rgba(253, 224, 71, ${0.85 * factor + 0.15})`;
            ctx.fill();
          }

          // Floating ember particles
          if (x % (step * 3) === 0) {
            const emberY = groundY - flameH - ((now * 0.04 + x * 10) % 25);
            const emberX = x + Math.sin(now * 0.005 + x) * 6;
            ctx.beginPath();
            ctx.arc(emberX, emberY, 1.2 * factor + 0.5, 0, Math.PI * 2);
            ctx.fillStyle = "#facc15";
            ctx.fill();
          }
        }

        // Ground burn streak
        ctx.beginPath();
        for (let x = minX; x <= maxX; x += step) {
          const gy = surface[x] ?? trail.position.y;
          if (x === minX) ctx.moveTo(x, gy);
          else ctx.lineTo(x, gy);
        }
        ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (type === "FROST") {
        // 2. Crystalline Frost Spikes along the terrain surface
        const step = 6;
        for (let x = minX; x <= maxX; x += step) {
          const dist = Math.abs(x - cx);
          const factor = Math.max(0, 1 - dist / rad);
          const groundY = surface[x] ?? trail.position.y;
          const spikeH = (10 + ((x * 17) % 12)) * factor;

          ctx.beginPath();
          ctx.moveTo(x - step * 0.6, groundY);
          ctx.lineTo(x, groundY - spikeH);
          ctx.lineTo(x + step * 0.6, groundY);
          ctx.closePath();
          ctx.fillStyle = "rgba(56, 189, 248, 0.65)";
          ctx.fill();
          ctx.strokeStyle = "#e0f2fe";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Frost glint
          ctx.beginPath();
          ctx.arc(x, groundY - spikeH, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }

        // Frost base mist
        ctx.beginPath();
        for (let x = minX; x <= maxX; x += step) {
          const gy = surface[x] ?? trail.position.y;
          if (x === minX) ctx.moveTo(x, gy);
          else ctx.lineTo(x, gy);
        }
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (type === "QUAKE") {
        // 3. Jagged Earth Fissure and tremor rubble along ground
        const step = 7;
        for (let x = minX; x <= maxX; x += step) {
          const dist = Math.abs(x - cx);
          const factor = Math.max(0, 1 - dist / rad);
          const groundY = surface[x] ?? trail.position.y;
          const tremor = Math.sin(now * 0.02 + x) * 2 * factor;
          const rubbleH = (8 + ((x * 13) % 10)) * factor;

          ctx.beginPath();
          ctx.moveTo(x - step * 0.5, groundY + tremor);
          ctx.lineTo(x - step * 0.2, groundY - rubbleH + tremor);
          ctx.lineTo(x + step * 0.2, groundY - rubbleH * 0.8 + tremor);
          ctx.lineTo(x + step * 0.5, groundY + tremor);
          ctx.closePath();
          ctx.fillStyle = "#78350f";
          ctx.fill();
          ctx.strokeStyle = "#fde68a";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Fissure crack line
        ctx.beginPath();
        for (let x = minX; x <= maxX; x += 5) {
          const gy = surface[x] ?? trail.position.y;
          const offset = ((x * 7) % 5) - 2.5;
          if (x === minX) ctx.moveTo(x, gy + offset);
          else ctx.lineTo(x, gy + offset);
        }
        ctx.strokeStyle = "rgba(217, 119, 6, 0.7)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (type === "ELECTRIC") {
        // 4. Crackling Lightning Arcs along ground surface
        const step = 10;
        ctx.beginPath();
        for (let x = minX; x <= maxX; x += step) {
          const gy = surface[x] ?? trail.position.y;
          const dist = Math.abs(x - cx);
          const factor = Math.max(0, 1 - dist / rad);
          const arcJitter = (Math.sin(now * 0.03 + x) * 8) * factor;
          if (x === minX) ctx.moveTo(x, gy + arcJitter);
          else ctx.lineTo(x, gy + arcJitter);
        }
        ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        for (let x = minX; x <= maxX; x += step * 1.5) {
          const gy = surface[Math.min(surface.length - 1, Math.round(x))] ?? trail.position.y;
          const dist = Math.abs(x - cx);
          const factor = Math.max(0, 1 - dist / rad);
          const arcJitter = (Math.cos(now * 0.04 + x) * 10) * factor;
          ctx.lineTo(x, gy + arcJitter);
          ctx.arc(x, gy + arcJitter, 2 * factor + 0.5, 0, Math.PI * 2);
        }
        ctx.strokeStyle = "rgba(168, 85, 247, 0.75)";
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawHazardVignettes(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
  ): void {
    if (!gameState.damageTrails || gameState.damageTrails.length === 0) return;
    const vp = this.gameViewport;
    const width = vp.width;
    const height = vp.height;

    // Check active hazard types ONLY if an alive tank is currently taking damage inside the trail
    let isAnyTankTakingDamage = false;
    let hasFire = false;
    let hasFrost = false;
    let hasQuake = false;
    let hasElectric = false;

    for (const trail of gameState.damageTrails) {
      for (const tank of gameState.tanks) {
        if (!tank.alive) continue;
        const dist = Math.hypot(tank.position.x - trail.position.x, tank.position.y - trail.position.y);
        const tankRadius = (tank.width ? Math.max(tank.width, tank.height) : 44) * 0.5;
        if (dist <= trail.radius + tankRadius) {
          isAnyTankTakingDamage = true;
          if (trail.hazardType === "FIRE") hasFire = true;
          else if (trail.hazardType === "FROST") hasFrost = true;
          else if (trail.hazardType === "QUAKE") hasQuake = true;
          else if (trail.hazardType === "ELECTRIC") hasElectric = true;
        }
      }
    }

    if (!isAnyTankTakingDamage) return;

    ctx.save();
    const pulse = 0.85 + Math.sin(Date.now() * 0.005) * 0.15;

    if (hasFire) {
      const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, width * 0.65);
      grad.addColorStop(0, "rgba(239, 68, 68, 0)");
      grad.addColorStop(1, `rgba(239, 68, 68, ${0.18 * pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    if (hasFrost) {
      const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, width * 0.65);
      grad.addColorStop(0, "rgba(56, 189, 248, 0)");
      grad.addColorStop(1, `rgba(56, 189, 248, ${0.18 * pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    if (hasQuake) {
      const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, width * 0.65);
      grad.addColorStop(0, "rgba(217, 119, 6, 0)");
      grad.addColorStop(1, `rgba(217, 119, 6, ${0.15 * pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    if (hasElectric) {
      const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, width * 0.65);
      grad.addColorStop(0, "rgba(168, 85, 247, 0)");
      grad.addColorStop(1, `rgba(168, 85, 247, ${0.18 * pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
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
      ctx.beginPath();
      ctx.arc(event.position.x, event.position.y, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
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

      // Player 1 Name, Tank Name & HP
      ctx.fillStyle = p1.alive ? (p1.visual?.fill || "#00f0ff") : "#ef4444";
      ctx.beginPath();
      ctx.arc(p1Layout.x + 12, p1Layout.y + 11, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 11px Inter, sans-serif";
      ctx.textAlign = "left";
      const p1Title = p1.tankName ? `${p1.displayName || "Player 1"} [${p1.tankName}]` : (p1.displayName || "Player 1");
      ctx.fillText(p1Title, p1Layout.x + 22, p1Layout.y + 14);

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
      ctx.fillStyle = p2.alive ? (p2.visual?.fill || "#f97316") : "#ef4444";
      ctx.beginPath();
      ctx.arc(p2Layout.x + p2Layout.width - 12, p2Layout.y + 11, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 11px Inter, sans-serif";
      ctx.textAlign = "right";
      const p2Title = p2.tankName ? `[${p2.tankName}] ${p2.displayName || "Player 2"}` : (p2.displayName || "Player 2");
      ctx.fillText(
        p2Title,
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
    const turnSeconds = Math.max(
      0,
      Math.min(
        gameState.match.turnTimeRemaining,
        gameState.match.matchTimeRemaining ?? Infinity,
      ),
    );
    const maxTurnSeconds = Math.min(
      30,
      Math.max(1, gameState.match.matchTimeRemaining ?? 30),
    );
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

  private drawProjectileIcon(
    ctx: CanvasRenderingContext2D,
    projectileId: string,
    cx: number,
    cy: number,
    radius: number,
  ): void {
    ctx.save();
    // Background disc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fill();

    switch (projectileId) {
      case "standardKaboom":
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "magmaMortar":
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(cx - radius * 0.15, cy - radius * 0.15, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "dragonsBreath":
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.22, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "lavaHopper":
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case "pyroclastCataclysm":
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#7f1d1d";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "cryoNeedle":
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#e0f2fe";
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.6, cy);
        ctx.lineTo(cx + radius * 0.6, cy - radius * 0.25);
        ctx.lineTo(cx + radius * 0.7, cy);
        ctx.lineTo(cx + radius * 0.6, cy + radius * 0.25);
        ctx.closePath();
        ctx.fill();
        break;

      case "apexAvalanche":
        ctx.strokeStyle = "#7dd3fc";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius * 0.65);
        ctx.lineTo(cx + radius * 0.45, cy);
        ctx.lineTo(cx, cy + radius * 0.65);
        ctx.lineTo(cx - radius * 0.45, cy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "frostbiteZone":
        ctx.strokeStyle = "#0ea5e9";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = "#e0f2fe";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius * 0.55);
        ctx.lineTo(cx, cy + radius * 0.55);
        ctx.moveTo(cx - radius * 0.55, cy);
        ctx.lineTo(cx + radius * 0.55, cy);
        ctx.stroke();
        break;

      case "glacialShatter":
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.fillStyle = "#0369a1";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#bae6fd";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "gravelGatling":
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#fde68a";
        for (let i = -1; i <= 1; i++) {
          ctx.fillRect(cx - radius * 0.4, cy + i * radius * 0.3 - 1.5, radius * 0.8, 3);
        }
        break;

      case "tectonicThumper":
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#b45309";
        ctx.beginPath();
        ctx.roundRect(cx - radius * 0.35, cy - radius * 0.5, radius * 0.7, radius, 2);
        ctx.fill();
        ctx.fillStyle = "#fde68a";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "sinkholeDrill":
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#451a03";
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.5, cy - radius * 0.4);
        ctx.lineTo(cx + radius * 0.5, cy - radius * 0.4);
        ctx.lineTo(cx, cy + radius * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1;
        ctx.stroke();
        break;

      case "quakeFissure":
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.4, cy - radius * 0.4);
        ctx.lineTo(cx + radius * 0.1, cy - radius * 0.1);
        ctx.lineTo(cx - radius * 0.1, cy + radius * 0.2);
        ctx.lineTo(cx + radius * 0.4, cy + radius * 0.5);
        ctx.stroke();
        break;

      case "arcSalvo":
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#06b6d4";
        ctx.beginPath();
        ctx.arc(cx - radius * 0.3, cy - radius * 0.25, radius * 0.2, 0, Math.PI * 2);
        ctx.arc(cx, cy + radius * 0.25, radius * 0.2, 0, Math.PI * 2);
        ctx.arc(cx + radius * 0.3, cy - radius * 0.25, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "staticApexStar":
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius * 0.6);
        ctx.lineTo(cx + radius * 0.5, cy + radius * 0.4);
        ctx.lineTo(cx - radius * 0.5, cy + radius * 0.4);
        ctx.closePath();
        ctx.fill();
        break;

      case "teslaGrid":
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#06b6d4";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "thunderstrikeCore":
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.6, cy);
        ctx.lineTo(cx + radius * 0.6, cy);
        ctx.stroke();
        ctx.fillStyle = "#a855f7";
        ctx.beginPath();
        ctx.arc(cx + radius * 0.3, cy, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;

      default:
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
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
    const fullName = projDef ? projDef.name : selectedSlotId || "Standard Kaboom";
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
      : "rgba(15, 23, 42, 0.92)";
    ctx.strokeStyle = isOpen
      ? "#facc15"
      : isHovered
      ? "#38bdf8"
      : "#8b5cf6";
    ctx.lineWidth = isOpen || isHovered ? 2.5 : 1.8;
    ctx.beginPath();
    ctx.roundRect(layout.x, layout.y, layout.width, layout.height, 12);
    ctx.fill();
    ctx.stroke();

    // 1. Draw Projectile Visual Icon
    this.drawProjectileIcon(
      ctx,
      selectedSlotId,
      layout.x + 20,
      layout.y + layout.height / 2,
      13,
    );

    // 2. Full Projectile Name & Hotkey Hint
    ctx.fillStyle = isOpen ? "#fef08a" : isHovered ? "#38bdf8" : "#ffffff";
    ctx.font = "700 10.5px Inter, sans-serif";
    ctx.textAlign = "left";
    
    // Truncate name if it exceeds container width minus paddings
    const maxTextWidth = layout.width - 64;
    let displayName = fullName;
    if (ctx.measureText(displayName).width > maxTextWidth) {
      while (displayName.length > 3 && ctx.measureText(displayName + "…").width > maxTextWidth) {
        displayName = displayName.slice(0, -1);
      }
      displayName += "…";
    }
    ctx.fillText(displayName, layout.x + 38, layout.y + 22);

    // Cycle & Hotkey hints
    ctx.fillStyle = isOpen ? "#facc15" : "#94a3b8";
    ctx.font = "600 9px Inter, sans-serif";
    ctx.fillText("⇄ [1-5]", layout.x + 38, layout.y + 38);

    // 3. Ammo Badge Chip (top-right)
    const ammoText = ammo === -1 ? "∞" : `${ammo}`;
    ctx.fillStyle = ammo === 0 ? "#ef4444" : ammo === -1 ? "#3b82f6" : "#f59e0b";
    ctx.beginPath();
    ctx.roundRect(layout.x + layout.width - 24, layout.y + 5, 19, 13, 4);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 8.5px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ammoText, layout.x + layout.width - 14.5, layout.y + 14.5);

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
      ctx.fillStyle = isSelected ? "#facc15" : "#64748b";
      ctx.font = "800 9px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`[${item.slotIndex + 1}]`, item.x + 6, item.y + item.height / 2 + 3.5);

      // Projectile Visual Icon
      this.drawProjectileIcon(
        ctx,
        slotId,
        item.x + 30,
        item.y + item.height / 2,
        12,
      );

      // Full Weapon Name
      const fullName = projDef ? projDef.name : slotId;
      ctx.fillStyle = isDepleted
        ? "#64748b"
        : isSelected
        ? "#fef08a"
        : isHovered
        ? "#38bdf8"
        : "#f8fafc";
      ctx.font = "700 11px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(fullName, item.x + 48, item.y + item.height / 2 + 3.5);

      // Ammo Badge
      const ammoText = ammo === -1 ? "∞" : `${ammo}`;
      ctx.fillStyle = isDepleted
        ? "#64748b"
        : isSelected
        ? "#facc15"
        : ammo === -1
        ? "#38bdf8"
        : "#f59e0b";
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
