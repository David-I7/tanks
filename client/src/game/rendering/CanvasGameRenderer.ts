import type { GameState } from "../types";
import { simulateTrajectoryPreview } from "../simulation/ballistics";
import { getProjectileSelectorLayout } from "../input/inputHelpers";
import type { DpiViewport, GameViewport } from "../world/worldSizing";

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
  private localPlayerId?: number;
  private screenShakeIntensity = 0;
  private lastImpactCount = 0;
  private readonly worldPasses: RenderPass[];
  private readonly overlayPasses: RenderPass[];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    gameViewport: GameViewport,
    dpiViewport: DpiViewport,
    localPlayerId?: number,
  ) {
    this.gameViewport = gameViewport;
    this.dpiViewport = dpiViewport;
    this.localPlayerId = localPlayerId;
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

  setLocalPlayerId(localPlayerId?: number): void {
    this.localPlayerId = localPlayerId;
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

  private updateCamera(gameState: GameState): void {
    const maxCameraX = Math.max(
      0,
      gameState.terrain.width - this.gameViewport.width,
    );
    const isLocked = gameState.match.isCameraLocked !== false;
    let targetCameraX: number;

    if (isLocked) {
      const activeTank = gameState.tanks.find(
        (entry) => entry.playerId === gameState.match.activePlayerId,
      );
      const focusX =
        gameState.projectiles[0]?.position.x ?? activeTank?.position.x ?? 0;
      targetCameraX = focusX - this.gameViewport.width * 0.5;
    } else {
      targetCameraX = gameState.match.cameraX ?? this.cameraX;
    }

    targetCameraX = Math.max(0, Math.min(maxCameraX, targetCameraX));
    this.cameraX += (targetCameraX - this.cameraX) * 0.15;
    this.cameraX = Math.max(0, Math.min(maxCameraX, this.cameraX));
  }

  private drawSky(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const theme = BIOME_THEMES[gameState.match.biome ?? "forest"] ?? BIOME_THEMES.forest;
    const width = this.gameViewport.width;
    const height = this.gameViewport.height;

    // 1. Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    for (const [stop, color] of theme.skyStops) {
      skyGrad?.addColorStop?.(stop, color);
    }
    if (skyGrad) ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Dynamic Twinkling & Glowing Star Field (world-space, behind sun)
    ctx.save();
    const now = Date.now();
    const worldWidth = gameState.terrain.kind === "heightmap" ? gameState.terrain.width : 2400;
    const starParallax = this.cameraX * 0.25;
    for (let i = 0; i < 65; i++) {
      const hashX = Math.sin(i * 12.9898 + 1.5) * 43758.5453;
      const hashY = Math.cos(i * 78.233 + 3.1) * 43758.5453;
      const worldX = (hashX - Math.floor(hashX)) * worldWidth;
      const baseY = (hashY - Math.floor(hashY)) * (height * 0.5);

      const driftX = Math.sin(now * 0.00015 + i * 1.7) * 4;
      const sx = worldX + driftX - starParallax;
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

    // 3. Sun Orb (world-space, in front of stars)
    ctx.save();
    const sunWorldX = worldWidth * 0.5;
    const sunParallax = this.cameraX * 0.15;
    const sunScreenX = sunWorldX - sunParallax;
    const sunY = height * 0.28;
    const sunGrad = ctx.createRadialGradient(sunScreenX, sunY, 10, sunScreenX, sunY, 160);
    for (const [stop, color] of theme.sunStops) {
      sunGrad?.addColorStop?.(stop, color);
    }
    if (sunGrad) ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunScreenX, sunY, 160, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Moving Clouds
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
      ctx.save();
      ctx.translate(dec.x, dec.y);
      ctx.rotate(dec.rotation);
      ctx.scale(dec.scale, dec.scale);

      if (dec.destroyed) {
        ctx.fillStyle = "#1c1917";
        ctx.fillRect(-6, -8, 12, 8);
        ctx.beginPath();
        ctx.arc(0, -8, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#ef444455";
        ctx.fill();
      } else if (dec.type === "tree") {
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
      const mainColor = entry.visual?.fill ?? "#3b82f6";
      const strokeColor = entry.visual?.stroke ?? "#1e40af";
      const accentColor = entry.visual?.accent ?? "#93c5fd";

      ctx.save();
      ctx.translate(entry.position.x, entry.position.y);
      ctx.rotate(entry.bodyAngle);

      // Clean subtle indicator for active tank
      if (isActive) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = `${mainColor}22`;
        ctx.fill();
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Barrel
      const rad = entry.aimAngle;
      const barrelLength = 28;
      const muzzleX = Math.cos(rad) * barrelLength;
      const muzzleY = -14 + Math.sin(rad) * barrelLength;

      ctx.beginPath();
      ctx.moveTo(0, -14);
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
      ctx.roundRect(-18, -20, 36, 14, 4);
      const bodyGrad = ctx.createLinearGradient(0, -20, 0, -6);
      bodyGrad.addColorStop(0, mainColor);
      bodyGrad.addColorStop(1, strokeColor);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Treads & Wheels
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(-22, -8, 44, 10, 3);
      ctx.fill();
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      for (let wx = -15; wx <= 15; wx += 10) {
        ctx.beginPath();
        ctx.arc(wx, -3, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#64748b";
        ctx.fill();
      }

      // HP Bar above tank
      ctx.save();
      ctx.rotate(-entry.bodyAngle);
      const barW = 44;
      const barH = 5;
      const hpRatio = Math.max(0, entry.health / entry.maxHealth);

      ctx.translate(0, -32);
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.beginPath();
      ctx.roundRect(-barW / 2 - 2, -3, barW + 4, barH + 6, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.stroke();

      ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#eab308" : "#ef4444";
      ctx.beginPath();
      ctx.roundRect(-barW / 2, -1, barW * hpRatio, barH, 2);
      ctx.fill();

      ctx.restore();
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
      const mainColor = entry.visual?.fill ?? "#f59e0b";
      const strokeColor = entry.visual?.stroke ?? "#d97706";

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
        ctx.translate(trail.x, trail.y);
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
      ctx.fillStyle = event.visual?.fill ?? "#ff4500";
      ctx.strokeStyle = event.visual?.stroke ?? "#ff8c00";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(event.position.x, event.position.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = event.visual?.accent ?? "#ffd700";
      ctx.font = "700 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(event.visual?.label ?? "", event.position.x, event.position.y + 6);
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

      if (crate.falling) {
        ctx.beginPath();
        ctx.arc(0, -22, 18, Math.PI, 0);
        ctx.fillStyle = "rgba(244, 63, 94, 0.85)";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-18, -22);
        ctx.lineTo(-8, -10);
        ctx.moveTo(18, -22);
        ctx.lineTo(8, -10);
        ctx.moveTo(0, -22);
        ctx.lineTo(0, -10);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const color =
        crate.type === "hp"
          ? "#22c55e"
          : crate.type === "fuel"
          ? "#f59e0b"
          : "#a855f7";

      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-12, -12, 24, 24, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        crate.type === "hp" ? "HP" : crate.type === "fuel" ? "F" : "A",
        0,
        4,
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
    if (gameState.match.phase !== "thinking") {
      return;
    }

    const activePlayerId = gameState.match.activePlayerId;
    const activeTank = gameState.tanks.find(
      (t) => t.playerId === activePlayerId && t.alive,
    );

    if (
      this.localPlayerId !== undefined &&
      activePlayerId !== this.localPlayerId
    ) {
      return;
    }
    if (activeTank && activeTank.controllerKind === "remote") {
      return;
    }

    const points = simulateTrajectoryPreview(gameState, activePlayerId);
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
    if (lastPoint) {
      ctx.save();
      let targetY = lastPoint.y;
      if (gameState.terrain.kind === "heightmap") {
        const clampedX = Math.max(
          0,
          Math.min(gameState.terrain.width - 1, Math.floor(lastPoint.x)),
        );
        const surfaceY = gameState.terrain.surface[clampedX] ?? lastPoint.y;
        targetY = surfaceY;
      }

      ctx.translate(lastPoint.x, targetY);

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

  private drawHud(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const headerHeight = 74;
    ctx.fillStyle = "rgba(6, 6, 8, 0.78)";
    ctx.fillRect(0, 0, this.gameViewport.width, headerHeight);

    this.drawHeaderTankStatus(ctx, gameState);
    this.drawPowerAngleReadout(ctx, gameState);
    this.drawProjectileSelector(ctx, gameState);

    if (gameState.match.isCameraLocked === false) {
      ctx.save();
      const relockX = this.gameViewport.width / 2 - 65;
      const relockY = 84;
      const relockW = 130;
      const relockH = 30;
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.strokeStyle = "#ebc80e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(relockX, relockY, relockW, relockH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ebc80e";
      ctx.font = "700 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🔒 RELOCK CAMERA", this.gameViewport.width / 2, relockY + 19);
      ctx.restore();
    }

    const matchMin = Math.floor((gameState.match.matchTimeRemaining ?? 180) / 60);
    const matchSec = Math.floor((gameState.match.matchTimeRemaining ?? 180) % 60);
    const matchTimeStr = `${String(matchMin).padStart(2, "0")}:${String(matchSec).padStart(2, "0")}`;

    const wind = gameState.match.wind ?? 0;
    const windDirection = wind >= 0 ? "→" : "←";
    const windStr = `WIND ${windDirection} ${Math.abs(wind).toFixed(1)} mph`;

    const seconds = Math.ceil(gameState.match.turnTimeRemaining);
    const activeTank = gameState.tanks.find(
      (entry) => entry.playerId === gameState.match.activePlayerId,
    );

    ctx.fillStyle = "#f3f4f6";
    ctx.font = "14px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `${matchTimeStr} | ${windStr} | TURN ${seconds}s | Fuel ${Math.ceil(activeTank?.fuel ?? 0)}`,
      this.gameViewport.width / 2,
      47,
    );
    ctx.textAlign = "start";

    if (gameState.match.phase === "gameOver") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
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
      this.drawHeaderHealthCard(ctx, leftTank, 14, 14, "left", gameState);
    }
    if (rightTank) {
      this.drawHeaderHealthCard(
        ctx,
        rightTank,
        this.gameViewport.width - 224,
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
    const width = 210;
    const ratio = Math.max(0, entry.health / entry.maxHealth);
    const selected = entry.playerId === gameState.match.activePlayerId;
    const name = `${entry.displayName}`;

    ctx.fillStyle = selected
      ? "rgba(235, 200, 14, 0.14)"
      : "rgba(15, 23, 42, 0.78)";
    ctx.strokeStyle = selected ? "#ebc80e" : "rgba(148, 163, 184, 0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, 44, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = entry.alive ? "#10b981" : "#ef4444";
    ctx.beginPath();
    ctx.arc(
      align === "left" ? x + 16 : x + width - 16,
      y + 22,
      7,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 12px Inter, sans-serif";
    ctx.textAlign = align;
    ctx.fillText(name, align === "left" ? x + 30 : x + width - 30, y + 17, 140);

    const barX = align === "left" ? x + 30 : x + width - 170;
    const barY = y + 26;
    const barW = 140;
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(barX, barY, barW, 8);
    ctx.fillStyle =
      ratio > 0.5 ? "#39ff14" : ratio > 0.25 ? "#facc15" : "#ff3131";
    ctx.fillRect(barX, barY, barW * ratio, 8);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.strokeRect(barX, barY, barW, 8);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.textAlign = align === "left" ? "right" : "left";
    ctx.fillText(
      `${Math.ceil(entry.health)}/${entry.maxHealth}`,
      align === "left" ? x + width - 10 : x + 10,
      y + 35,
    );
    ctx.textAlign = "start";
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
    if (gameState.match.phase !== "thinking") {
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
      const selected = slot.id === activeTank.selectedProjectileSlotId;
      const x = layout.x + index * (layout.slotSize + layout.gap);
      const y = layout.y + (selected ? -8 : 0);
      const size = layout.slotSize + (selected ? 10 : 0);
      const offset = selected ? -5 : 0;

      const ammo = activeTank.weaponAmmo?.[slot.id] ?? (slot.maxAmmo ?? 1);
      const isDepleted = ammo === 0;

      ctx.fillStyle = isDepleted
        ? "rgba(30, 41, 59, 0.45)"
        : selected
        ? "#facc15"
        : "rgba(15, 23, 42, 0.88)";
      ctx.strokeStyle = isDepleted
        ? "rgba(71, 85, 105, 0.4)"
        : selected
        ? "#7c3aed"
        : "rgba(148, 163, 184, 0.35)";
      ctx.lineWidth = selected && !isDepleted ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(x + offset, y + offset, size, size, 9);
      ctx.fill();
      ctx.stroke();

      const ammoText = ammo === -1 ? "∞" : `${ammo}`;
      ctx.fillStyle = isDepleted ? "#64748b" : selected ? "#111827" : "#cbd5e1";
      ctx.font = "700 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `${slot.label} (${ammoText})`,
        x + layout.slotSize / 2,
        y + layout.slotSize - 9,
      );
    }

    ctx.restore();
    ctx.textAlign = "start";

    // Draw FIRE button
    const totalWidth =
      activeTank.loadout.length * layout.slotSize +
      Math.max(0, activeTank.loadout.length - 1) * layout.gap;
    const fireX = layout.x + totalWidth + 12;
    const fireY = layout.y;
    const fireW = 76;
    const fireH = layout.slotSize;

    const currentSlotId =
      activeTank.selectedProjectileSlotId ?? activeTank.loadout[0]?.id;
    const currentAmmo = currentSlotId
      ? activeTank.weaponAmmo?.[currentSlotId] ?? 1
      : 0;
    const canFire = currentAmmo !== 0 && gameState.match.phase === "thinking";

    ctx.save();
    const fireGrad = ctx.createLinearGradient(fireX, fireY, fireX, fireY + fireH);
    fireGrad?.addColorStop?.(0, canFire ? "#ef4444" : "#475569");
    fireGrad?.addColorStop?.(1, canFire ? "#991b1b" : "#1e293b");
    if (fireGrad) ctx.fillStyle = fireGrad;
    ctx.strokeStyle = canFire ? "#f87171" : "#64748b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(fireX, fireY, fireW, fireH, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 13px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FIRE", fireX + fireW / 2, fireY + fireH / 2 + 2);
    ctx.font = "700 9px Inter, sans-serif";
    ctx.fillStyle = canFire ? "#fca5a5" : "#94a3b8";
    ctx.fillText("[Space]", fireX + fireW / 2, fireY + fireH - 6);
    ctx.restore();
  }
}
