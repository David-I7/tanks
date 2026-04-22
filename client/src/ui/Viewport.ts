import CanvasResizeEvent from "../interfaces/events/CanvasResizeEvent";

type ViewportEventListener = (e: CanvasResizeEvent) => void;

export default class Viewport {
  public rect: DOMRect;
  private listeners: ViewportEventListener[] = [];

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

      this.dispatch({
        time: performance.now(),
        type: "viewportResize",
        newHeight: this.rect.height,
        newWidth: this.rect.width,
      });
    });

    observer.observe(canvas);

    window.addEventListener("scroll", updateRect, true);
  }

  addEventListener(listener: ViewportEventListener) {
    this.listeners.push(listener);
  }

  removeEventListener(listener: ViewportEventListener) {
    for (let i = 0; i < this.listeners.length; ++i) {
      if (this.listeners[i] === listener) {
        this.listeners.splice(i, 1);
        break;
      }
    }
  }

  private dispatch(e: CanvasResizeEvent) {
    this.listeners.forEach((listener) => {
      listener(e);
    });
  }

  getWidth() {
    return this.width;
  }

  getHeight() {
    return this.height;
  }
}
