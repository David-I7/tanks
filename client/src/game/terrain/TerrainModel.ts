export class TerrainModel {
  readonly surface: number[];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.surface = Array.from({ length: width }, (_, x) =>
      Math.floor(height * 0.64 + Math.sin(x * 0.009) * 58 + Math.sin(x * 0.024) * 22),
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
    const samples = 16;
    for (let i = 0; i < samples; i += 1) {
      const angle = (i / samples) * Math.PI * 2;
      if (this.isSolid(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)) {
        return true;
      }
    }
    return false;
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
  }

  getSlopeAngle(x: number): number {
    const left = this.getSurfaceY(x - 3);
    const right = this.getSurfaceY(x + 3);
    return Math.atan2(right - left, 6);
  }

  cloneSurface(): number[] {
    return [...this.surface];
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
}
