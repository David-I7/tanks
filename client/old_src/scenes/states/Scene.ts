import Animatable from "../../interfaces/Animatable";

export type EnterContext = {
  prevScene: string;
} & Record<string, any>;

export default interface Scene extends Animatable {
  draw(ctx: CanvasRenderingContext2D): void;
  update(dt: number): void;
  enter(ctx: EnterContext): void;
  exit(): void;
}
