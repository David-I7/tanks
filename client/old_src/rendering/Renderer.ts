import Camera from "../ui/Camera.js";
import Drawable from "../interfaces/Drawable.js";
import Renderable from "./Renderable.js";

export default class Renderer {
  private ctx: CanvasRenderingContext2D;
  private layerQueue: Map<number, Renderable[]> = new Map();
  private layers: number[] = [];

  constructor(
    ctx: CanvasRenderingContext2D,
    private width: number,
    private height: number,
  ) {
    this.ctx = ctx;
  }

  push(renderable: Renderable, layer: number = 0): void {
    let q = this.layerQueue.get(layer);
    if (!q) {
      this.layerQueue.set(layer, []);
      this.layers.push(layer);
      this.layers.sort();
      q = [] as Renderable[];
    }
    q.push(renderable);
  }

  private begin(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);
    //this.camera.apply(this.ctx);
  }

  private flush(): void {
    this.layers.forEach((layer) => {
      this.layerQueue.get(layer)!.forEach((renderable) => {
        renderable.render(this.ctx);
      });
    });

    this.layerQueue.clear();
    this.layers.length = 0;
  }

  render() {
    this.begin();
    this.flush();
  }

  // For debug drawing or direct access if needed
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
