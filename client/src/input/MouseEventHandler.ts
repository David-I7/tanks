export default class MouseEventHandler {
  private mouse: {
    x: number;
    y: number;
    pressed: boolean;
    released: boolean;
    isDown: boolean;
    moved: boolean;
  } = {
    x: 0,
    y: 0,
    pressed: false,
    isDown: false,
    released: false,
    moved: false,
  };

  private buffer = {
    pressed: false,
    released: false,
    moved: false,
  };

  private signals!: AbortController[];

  constructor() {
    this.init();
  }

  private init() {
    this.signals = Array.from({ length: 4 }, (_) => new AbortController());

    let i = 0;
    window.addEventListener(
      "mousedown",
      (e) => {
        console.log(e);
        this.buffer.pressed = true;
        this.mouse.isDown = true;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        console.log("down");
      },
      { signal: this.signals[i++].signal },
    );
    window.addEventListener(
      "mousemove",
      (e) => {
        //console.log(e);
        // this.buffer.pressed = true;
        // this.mouse.isDown = true;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      },
      { signal: this.signals[i++].signal },
    );
    window.addEventListener(
      "mouseup",
      (e) => {
        console.log(e);
        console.log("mouse up");
        // We do not set buffer.pressed to false because we still want to register the fact that the mouse was pressed
        this.buffer.released = true;
        this.mouse.isDown = false;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      },
      { signal: this.signals[i++].signal },
    );
    window.addEventListener(
      "mouseleave",
      (e) => {
        this.buffer.released = true;
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

  wasMoved(): boolean {
    return this.buffer.moved;
  }

  wasPressed(): boolean {
    return this.mouse.pressed;
  }

  wasReleased(): boolean {
    return this.mouse.released;
  }

  update() {
    this.mouse.pressed = this.buffer.pressed;
    this.buffer.pressed = false;
    this.mouse.released = this.buffer.released;
    this.buffer.released = false;
    this.mouse.moved = this.buffer.moved;
    this.buffer.moved = false;
  }

  reset() {
    this.mouse = {
      x: 0,
      y: 0,
      pressed: false,
      isDown: false,
      released: false,
      moved: false,
    };
    this.signals.forEach((signal) => signal.abort());
    this.init();
  }
}
