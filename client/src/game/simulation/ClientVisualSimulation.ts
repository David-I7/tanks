import type {
  Particle,
  FloatingText,
  Cloud,
  LootCrate,
  Vec2,
} from "../types";

export type ActiveProjectileFlight = {
  projectileEntityId: number;
  ownerPlayerId: number;
  projectileDefinitionId: string;
  trajectory: { x: number; y: number }[];
  durationSeconds: number;
  elapsedSeconds: number;
};

export type ClientVisualState = {
  cameraX: number;
  isCameraLocked: boolean;
  activeFlight: ActiveProjectileFlight | null;
  particles: Particle[];
  floatingTexts: FloatingText[];
  clouds: Cloud[];
};

const CAMERA_SMOOTHING_SPEED = 10;

export class ClientVisualSimulation {
  private cameraX: number;
  private isCameraLocked: boolean;
  private activeFlight: ActiveProjectileFlight | null = null;
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private clouds: Cloud[] = [];

  constructor(initialCameraX = 0, terrainWidth = 2400) {
    this.cameraX = initialCameraX;
    this.isCameraLocked = true;
    this.initClouds(terrainWidth);
  }

  private initClouds(terrainWidth: number): void {
    const cloudCount = 6;
    for (let i = 0; i < cloudCount; i++) {
      this.clouds.push({
        x: (i / cloudCount) * terrainWidth,
        y: 40 + Math.random() * 80,
        speed: 0.2 + Math.random() * 0.3,
        scale: 0.7 + Math.random() * 0.6,
        opacity: 0.4 + Math.random() * 0.4,
      });
    }
  }

  getState(): ClientVisualState {
    return {
      cameraX: this.cameraX,
      isCameraLocked: this.isCameraLocked,
      activeFlight: this.activeFlight ? { ...this.activeFlight } : null,
      particles: this.particles.map((p) => ({ ...p })),
      floatingTexts: this.floatingTexts.map((ft) => ({ ...ft })),
      clouds: this.clouds.map((c) => ({ ...c })),
    };
  }

  panCamera(deltaX: number, viewportWidth: number = 960, terrainWidth: number = 2400): void {
    const maxCameraX = Math.max(0, terrainWidth - viewportWidth);
    this.isCameraLocked = false;
    this.cameraX = Math.max(0, Math.min(maxCameraX, this.cameraX + deltaX));
  }

  relockCamera(): void {
    this.isCameraLocked = true;
  }

  setCameraPosition(x: number, viewportWidth: number = 960, terrainWidth: number = 2400): void {
    const maxCameraX = Math.max(0, terrainWidth - viewportWidth);
    this.cameraX = Math.max(0, Math.min(maxCameraX, x));
  }

  updateCamera(
    dt: number,
    focusX: number | null,
    viewportWidth: number = 960,
    terrainWidth: number = 2400,
  ): void {
    if (!this.isCameraLocked || focusX === null) return;
    const maxCameraX = Math.max(0, terrainWidth - viewportWidth);
    const targetCameraX = Math.max(0, Math.min(maxCameraX, focusX - viewportWidth * 0.5));
    const lerpFactor = 1 - Math.exp(-CAMERA_SMOOTHING_SPEED * dt);
    this.cameraX += (targetCameraX - this.cameraX) * lerpFactor;
    this.cameraX = Math.max(0, Math.min(maxCameraX, this.cameraX));
  }

  updateLootCrates(dt: number, crates: LootCrate[]): void {
    for (const crate of crates) {
      if (crate.isLanding) {
        const targetY = crate.targetY;
        crate.y = Math.min(targetY, crate.y + 150 * dt);
        if (crate.y >= targetY) {
          crate.y = targetY;
          crate.isLanding = false;
        }
      }
    }
  }

  startTrajectoryFlight(flight: ActiveProjectileFlight): void {
    this.activeFlight = {
      ...flight,
      elapsedSeconds: 0,
    };
  }

  updateProjectileFlight(dt: number): { position: Vec2; velocity: Vec2 } | null {
    if (!this.activeFlight) return null;

    this.activeFlight.elapsedSeconds += dt;
    const trajectory = this.activeFlight.trajectory;
    if (!trajectory || trajectory.length === 0) {
      this.activeFlight = null;
      return null;
    }

    const duration =
      this.activeFlight.durationSeconds > 0
        ? this.activeFlight.durationSeconds
        : 1.0;
    const progress = Math.min(1, this.activeFlight.elapsedSeconds / duration);

    let position: Vec2;
    let velocity: Vec2;

    if (trajectory.length === 1) {
      position = { ...trajectory[0]! };
      velocity = { x: 0, y: 0 };
    } else {
      const scaled = progress * (trajectory.length - 1);
      const idx = Math.min(trajectory.length - 2, Math.floor(scaled));
      const frac = scaled - idx;
      const p0 = trajectory[idx]!;
      const p1 = trajectory[idx + 1]!;

      position = {
        x: p0.x + (p1.x - p0.x) * frac,
        y: p0.y + (p1.y - p0.y) * frac,
      };

      const dtStep = duration / (trajectory.length - 1);
      velocity = {
        x: dtStep > 0 ? (p1.x - p0.x) / dtStep : 0,
        y: dtStep > 0 ? (p1.y - p0.y) / dtStep : 0,
      };
    }

    if (progress >= 1) {
      this.activeFlight = null;
    }

    return { position, velocity };
  }

  spawnExplosionParticles(x: number, y: number, colors?: string[]): void {
    const palette = colors ?? ["#fbbf24", "#f97316", "#ef4444", "#78716c", "#44403c"];
    for (let i = 0; i < 18; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      this.particles.push({
        id: `particle-${Date.now()}-${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        color: palette[Math.floor(Math.random() * palette.length)] ?? "#fbbf24",
        size: 2 + Math.random() * 3,
        life: 1.0,
        maxLife: 1.0,
      });
    }
  }

  spawnFloatingText(text: string, color: string, x: number, y: number): void {
    this.floatingTexts.push({
      id: `text-${Date.now()}-${Math.random()}`,
      text,
      color,
      x,
      y,
      vy: -60,
      life: 1.0,
      maxLife: 1.0,
    });
  }

  updateEffects(dt: number, terrainWidth: number): void {
    // Particles
    const nextParticles: Particle[] = [];
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt;
      if (p.life > 0) {
        nextParticles.push(p);
      }
    }
    this.particles = nextParticles;

    // Floating Texts
    const nextTexts: FloatingText[] = [];
    for (const ft of this.floatingTexts) {
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life > 0) {
        nextTexts.push(ft);
      }
    }
    this.floatingTexts = nextTexts;

    // Clouds
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x > terrainWidth + 100) {
        cloud.x = -100;
      }
    }
  }
}
