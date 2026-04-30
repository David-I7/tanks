import { InputManager } from "../input/InputManager";

export default class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  private isDragging: boolean = false;

  constructor(private inputManager: InputManager) {}

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

  update(dt: number): void {
    // const mouse = this.inputManager.mouse;
    // // --- DRAG CAMERA ---
    // if (mouse.hasDragStarted()) {
    //   this.isDragging = true;
    // }
    // if (this.isDragging && mouse.hasDragMoved()) {
    //   for (const e of mouse.getDragMoves()) {
    //     this.camera.x -= e.deltaX / this.camera.zoom;
    //     this.y -= e.deltaY / this.zoom;
    //   }
    // }
    // if (!this.isDragging) {
    //   this.isDragging = false;
    // }
    // // --- ZOOM (example: wheel) ---
    // if (mouse.hasWheelMoved()) {
    //   const wheels = mouse.getWheelMoves();
    //   const { x: mx, y: my, deltaY: delta } = wheels[wheels.length - 1];
    //   const beforeX = this.x + mx / this.zoom;
    //   const beforeY = this.y + my / this.zoom;
    //   this.zoom *= 1 + -delta * 0.001;
    //   this.zoom = Math.max(0.5, Math.min(2, this.zoom));
    //   // keep cursor stable
    //   this.x = beforeX - mx / this.zoom;
    //   this.y = beforeY - my / this.zoom;
    // }
    // // --- CLAMP CAMERA ---
    // this.x = Math.max(
    //   0,
    //   Math.min(this.terrain.width - this.viewportWidth / this.zoom, this.x),
    // );
    // this.y = Math.max(
    //   0,
    //   Math.min(this.terrain.height - this.viewportHeight / this.zoom, this.y),
    // );
  }
}
