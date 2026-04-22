import Drawable from "../../interfaces/Drawable.js";

export default class Terrain implements Drawable {
  width: number;
  height: number;
  private imageData!: ImageData;

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
  }

  private generate() {
    const h = this.canvas.height;

    this.ctx.fillStyle = "green";
    this.ctx.beginPath();
    this.ctx.moveTo(0, h);

    for (let x = 0; x < this.canvas.width; x++) {
      const y = h * 0.6 + Math.sin(x * 0.01) * 50 + Math.sin(x * 0.03) * 25;

      this.ctx.lineTo(x, y);
    }

    this.ctx.lineTo(this.canvas.width, h);
    this.ctx.closePath();
    this.ctx.fill();

    this.imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
  }

  private isSolid(x: number, y: number): boolean {
    const ix = Math.floor(x);
    const iy = Math.floor(y);

    if (
      ix < 0 ||
      ix >= this.imageData.width ||
      iy < 0 ||
      iy >= this.imageData.height
    )
      return false;

    const index = (iy * this.imageData.width + ix) * 4;
    const alpha = this.imageData.data[index + 3];

    return alpha > 10;
  }

  intersects(x: number, y: number) {
    return this.isSolid(x, y);
  }

  intersectsCircle(cx: number, cy: number, r: number) {
    const samples = 12;
    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * Math.PI * 2;

      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      if (this.isSolid(x, y)) {
        return true;
      }
    }
  }

  getSurfaceY(x: number, startY: number): number {
    const isSolidStart = this.isSolid(x, startY) === true;
    if (isSolidStart) {
      for (let y = startY - 1; y > 0; y--) {
        if (!this.isSolid(x, y)) {
          return y + 1;
        }
      }

      return 0;
    } else {
      for (let y = startY + 1; y < this.canvas.height; y++) {
        if (this.isSolid(x, y)) {
          return y;
        }
      }
      return this.canvas.height;
    }
  }

  getNormal(x: number) {
    const dx = 4;
    const dy = this.getSurfaceY(x + 2, 0) - this.getSurfaceY(x - 2, 0);

    const nx = -dy;
    const ny = dx;

    const len = Math.sqrt(nx * nx + ny * ny) || 1;

    return { nx: nx / len, ny: ny / len };
  }

  getSlopeVector(x: number) {
    const dx = 4;
    const dy = this.getSurfaceY(x + 2, 0) - this.getSurfaceY(x - 2, 0);

    const len = Math.sqrt(dx * dx + dy * dy);

    return { x: dx / len, y: dy / len };
  }

  destroy(cx: number, cy: number, explosionRadius: number) {
    // The existing content is kept where it doesn't overlap the new shape.
    this.ctx.globalCompositeOperation = "destination-out";

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, explosionRadius, 0, Math.PI * 2);
    this.ctx.fill();
    // This is the default setting and draws new shapes on top of the existing canvas content.
    this.ctx.globalCompositeOperation = "source-over";
    this.imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(this.canvas, 0, 0);
  }
}
