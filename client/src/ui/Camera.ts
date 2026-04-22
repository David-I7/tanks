export default class Camera {
  x = 0;
  y = 0;
  zoom = 1;

  constructor(
    public width: number,
    public height: number,
  ) {}

  apply(ctx: CanvasRenderingContext2D) {
    // transform(xScale, ySkew, xSkew, yScale, xTrans, yTrans)
    // default transform matrix is (1,0,0,1,0,0)
    ctx.setTransform(
      this.zoom,
      0,
      0,
      this.zoom,
      -this.x * this.zoom,
      -this.y * this.zoom,
    );
  }
}
