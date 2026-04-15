export default interface State {
  draw(ctx: CanvasRenderingContext2D): void;
  update(dt: number): void;
  enter(...args: any[]): void;
  exit(): void;
}
