import Camera from "../ui/Camera.js";
import Drawable from "../interfaces/Drawable.js";

// interface RenderCommand {
//   drawable: Drawable;
// }

export default class Renderer {
  canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  camera: Camera;
  private renderQueueMap: Map<number, Drawable[]> = new Map();
  private layers: number[] = [];

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.camera = camera;
  }

  enqueue(drawable: Drawable, layer: number = 0): void {
    let q = this.renderQueueMap.get(layer);
    if (!q) {
      this.renderQueueMap.set(layer, []);
      this.layers.push(layer);
      this.layers.sort();
      q = [] as Drawable[];
    }
    q.push(drawable);
  }

  begin(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.camera.apply(this.ctx);
  }

  flush(): void {
    this.layers.forEach((layer) => {
      this.renderQueueMap.get(layer)!.forEach((drawable) => {
        drawable.draw(this.ctx);
      });
    });

    this.renderQueueMap.clear();
    this.layers.length = 0;
  }

  // For debug drawing or direct access if needed
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
