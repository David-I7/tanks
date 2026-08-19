import type { TerrainEffect, TerrainSnapshot } from "../types";

const TERRAIN_BASELINE_RATIO = 0.64;
const TERRAIN_FREQ_1 = 0.009;
const TERRAIN_AMP_1 = 58;
const TERRAIN_FREQ_2 = 0.024;
const TERRAIN_AMP_2 = 22;
const CIRCLE_INTERSECTION_SAMPLES = 16;
const SMOOTH_PADDING = 8;
const STEP_LIMIT_PADDING = 10;
const MAX_ADJACENT_STEP = 5;
const SMOOTH_PASSES = 2;

export class LocalTerrainModel {
  readonly surface: number[];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.surface = Array.from({ length: width }, (_, x) =>
      Math.floor(
        height * TERRAIN_BASELINE_RATIO +
          Math.sin(x * TERRAIN_FREQ_1) * TERRAIN_AMP_1 +
          Math.sin(x * TERRAIN_FREQ_2) * TERRAIN_AMP_2,
      ),
    );
  }

  getSurfaceY(x: number): number {
    const ix = this.clampX(x);
    return this.surface[ix] ?? this.height;
  }

  isSolid(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return y >= this.getSurfaceY(x);
  }

  intersectsCircle(cx: number, cy: number, radius: number): boolean {
    for (let i = 0; i < CIRCLE_INTERSECTION_SAMPLES; i += 1) {
      const angle = (i / CIRCLE_INTERSECTION_SAMPLES) * Math.PI * 2;
      if (this.isSolid(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)) {
        return true;
      }
    }
    return false;
  }

  applyTerrainEffect(cx: number, cy: number, effect: TerrainEffect): void {
    if (effect.type === "drill") {
      return this.deform(cx, cy + effect.depth, effect.radius);
    }

    return this.deform(cx, cy, effect.radius);
  }

  deform(cx: number, cy: number, radius: number): void {
    const startX = Math.max(0, Math.floor(cx - radius));
    const endX = Math.min(this.width - 1, Math.ceil(cx + radius));

    for (let x = startX; x <= endX; x += 1) {
      const dx = x - cx;
      const remaining = radius * radius - dx * dx;
      if (remaining < 0) continue;

      const craterBottomY = Math.floor(cy + Math.sqrt(remaining));
      this.surface[x] = Math.min(this.height, Math.max(this.surface[x] ?? this.height, craterBottomY));
    }

    this.smoothRange(Math.max(0, startX - SMOOTH_PADDING), Math.min(this.width - 1, endX + SMOOTH_PADDING));
    this.limitAdjacentStep(
      Math.max(0, startX - STEP_LIMIT_PADDING),
      Math.min(this.width - 1, endX + STEP_LIMIT_PADDING),
      MAX_ADJACENT_STEP,
    );
  }

  getSlopeAngle(x: number, tankWidth = 44): number {
    const halfWidth = Math.max(1, Math.floor(tankWidth / 2));
    const left = this.getSurfaceY(x - halfWidth);
    const right = this.getSurfaceY(x + halfWidth);
    return Math.atan2(right - left, halfWidth * 2);
  }

  cloneSurface(): number[] {
    return [...this.surface];
  }

  snapshot(): TerrainSnapshot {
    return {
      kind: "heightmap",
      width: this.width,
      height: this.height,
      surface: this.surface,
    };
  }

  replaceSurface(surface: number[]): void {
    const limit = Math.min(surface.length, this.surface.length);
    for (let i = 0; i < limit; i += 1) {
      this.surface[i] = surface[i] ?? this.height;
    }
  }

  private clampX(x: number): number {
    return Math.max(0, Math.min(this.width - 1, Math.floor(x)));
  }

  private smoothRange(startX: number, endX: number): void {
    for (let pass = 0; pass < SMOOTH_PASSES; pass += 1) {
      const next = [...this.surface];
      for (let x = startX; x <= endX; x += 1) {
        const left = this.surface[Math.max(0, x - 1)] ?? this.height;
        const current = this.surface[x] ?? this.height;
        const right = this.surface[Math.min(this.width - 1, x + 1)] ?? this.height;
        next[x] = Math.round(left * 0.25 + current * 0.5 + right * 0.25);
      }
      for (let x = startX; x <= endX; x += 1) {
        this.surface[x] = next[x] ?? this.height;
      }
    }
  }

  private limitAdjacentStep(startX: number, endX: number, maxStep: number): void {
    for (let x = startX + 1; x <= endX; x += 1) {
      const previous = this.surface[x - 1] ?? this.height;
      const current = this.surface[x] ?? this.height;
      if (current - previous > maxStep) {
        this.surface[x] = previous + maxStep;
      } else if (previous - current > maxStep) {
        this.surface[x] = previous - maxStep;
      }
    }

    for (let x = endX - 1; x >= startX; x -= 1) {
      const next = this.surface[x + 1] ?? this.height;
      const current = this.surface[x] ?? this.height;
      if (current - next > maxStep) {
        this.surface[x] = next + maxStep;
      } else if (next - current > maxStep) {
        this.surface[x] = next - maxStep;
      }
    }
  }
}
