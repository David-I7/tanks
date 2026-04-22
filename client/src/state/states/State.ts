import Animatable from "../../interfaces/Animatable";
import Drawable from "../../interfaces/Drawable";

export default interface State extends Drawable, Animatable {
  draw(ctx: CanvasRenderingContext2D): void;
  update(dt: number): void;
  enter(...args: any[]): void;
  exit(): void;
}
