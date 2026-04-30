import Scene, { EnterContext } from "./Scene";

export default class GameScene implements Scene {
  enter(ctx: EnterContext): void {}

  exit(): void {}

  update(dt: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {}
}
