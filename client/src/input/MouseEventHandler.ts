export default class MouseEventHandler {
  private mouse: {
    x: number;
    y: number;
    pressed: boolean;
    isDown: boolean;
  } = {
    x: 0,
    y: 0,
    pressed: false,
    isDown: false,
  };

  private pressedBuffer: boolean = false;

  private signals!: AbortController[];

  constructor() {
    this.init();
  }

  private init() {
    this.signals = Array.from({ length: 3 }, (_) => new AbortController());

    let i = 0;
    window.addEventListener(
      "mousedown",
      (e) => {
        this.pressedBuffer = true;
        this.mouse.isDown = true;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      },
      { signal: this.signals[i++].signal },
    );
    window.addEventListener(
      "mouseup",
      (e) => {
        this.pressedBuffer = false;
        this.mouse.isDown = false;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      },
      { signal: this.signals[i++].signal },
    );
    window.addEventListener(
      "mouseleave",
      (e) => {
        this.pressedBuffer = false;
        this.mouse.isDown = false;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      },
      { signal: this.signals[i++].signal },
    );
  }

  getMouse(): typeof this.mouse {
    return this.mouse;
  }

  isDown(): boolean {
    return this.mouse.isDown;
  }

  wasPressed(): boolean {
    this.mouse.pressed = this.pressedBuffer;
    this.pressedBuffer = false;
    return this.mouse.pressed;
  }

  update() {
    this.mouse.pressed = false;
  }

  reset() {
    this.mouse = {
      x: 0,
      y: 0,
      pressed: false,
      isDown: false,
    };
    this.signals.forEach((signal) => signal.abort());
    this.init();
  }
}
