import CanvasResizeEvent from "../events/canvas/CanvasResizeEvent";
import { InputEventBuffer } from "../events/InputEventBuffer";

export default class ViewportInput {
  public rect: DOMRect;

  private resizeEvent: CanvasResizeEvent | null = null;

  constructor(
    private width: number,
    private height: number,
    canvas: HTMLCanvasElement,
  ) {
    this.rect = canvas.getBoundingClientRect();

    const updateRect = () => {
      this.rect = canvas.getBoundingClientRect();
    };

    const observer = new ResizeObserver(() => {
      updateRect();
      canvas.width = this.rect.width;
      canvas.height = this.rect.height;

      this.width = this.rect.width;
      this.height = this.rect.height;

      this.resizeEvent = {
        type: "viewportResize",
        width: this.width,
        height: this.height,
        time: performance.now(),
      };
    });

    observer.observe(canvas);

    window.addEventListener("scroll", updateRect, true);
  }

  collect(eventBuffer: InputEventBuffer) {
    if (this.resizeEvent !== null) {
      eventBuffer.push(this.resizeEvent);
    }
  }
}
