export default class Terrain {
  heights: number[] = [];
  width: number;
  height: number;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;

    this.ctx = this.canvas.getContext("2d")!;

    this.generate();
    this.redraw();
  }

  private generate() {
    for (let x = 0; x < Math.floor(this.width); x++) {
      this.heights[x] =
        this.height * 0.6 + Math.sin(x * 0.01) * 50 + Math.sin(x * 0.03) * 25;
    }
  }

  getHeight(x: number): number {
    const xi = Math.max(0, Math.min(Math.floor(this.width) - 1, Math.floor(x)));
    return this.heights[xi];
  }

  getNormal(x: number) {
    const x0 = Math.max(0, Math.floor(x) - 1);
    const x1 = Math.min(Math.floor(this.width) - 1, Math.floor(x) + 1);

    const dy = this.heights[x1] - this.heights[x0];
    const dx = x1 - x0;

    const nx = -dy;
    const ny = dx;

    const len = Math.sqrt(nx * nx + ny * ny) || 1;

    return { nx: nx / len, ny: ny / len };
  }

  isSolid(x: number, y: number, radius: number = 0): boolean {
    return y + radius >= this.getHeight(x);
  }

  destroy(cx: number, cy: number, explosionRadius: number) {
    for (
      let x = Math.floor(cx - explosionRadius);
      x <= cx + explosionRadius;
      x++
    ) {
      if (x < 0 || x >= this.width) continue;

      // Relative x
      const dx = x - cx;
      // x^2
      const distSq = dx * dx;

      const groundY = this.getHeight(x);

      // x^2 + y^2 = r^2 => y = sqrt(r^2 - x^2)
      const depth = Math.sqrt(explosionRadius * explosionRadius - distSq);

      // actual y on the screen
      const targetY = cy + depth;

      // only push terrain downward if below explosion curve
      if (targetY > groundY) {
        this.heights[x] = Math.min(this.height, targetY);
      }
    }

    this.redraw();
  }

  private redraw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = "green";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);

    for (let x = 0; x < this.width; x++) {
      this.ctx.lineTo(x, this.heights[x]);
    }

    this.ctx.lineTo(this.width, this.height);
    this.ctx.closePath();
    this.ctx.fill();
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(this.canvas, 0, 0);
  }
}
