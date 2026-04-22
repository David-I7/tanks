import Drawable from "./Drawable";

export default interface Animatable extends Drawable {
  draw(ctx: CanvasRenderingContext2D): void;
  update(dt: number): void;
}
