import State from "./State.js";

export default class Empty implements State {
  draw(ctx: CanvasRenderingContext2D): void {}
  update(dt: number): void {}
  enter(...args: any[]): void {}
  exit(): void {}
}
