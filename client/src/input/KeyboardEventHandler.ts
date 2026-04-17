export default class KeyboardEventHandler {
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private keysReleased: Set<string> = new Set();
  private pressedBuffer: Set<string> = new Set();
  private releasedBuffer: Set<string> = new Set();
  private signals!: AbortController[];

  constructor(canvas: HTMLCanvasElement) {
    this.init(canvas);
  }

  init(canvas: HTMLCanvasElement) {
    this.signals = Array.from({ length: 2 }, (_) => new AbortController());

    let i = 0;
    window.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        this.keysDown.add(e.code);
        if (!e.repeat) {
          this.pressedBuffer.add(e.code);
        }
      },
      { signal: this.signals[i++].signal },
    );
    window.addEventListener(
      "keyup",
      (e) => {
        this.keysDown.delete(e.code);
        this.releasedBuffer.add(e.code);
      },
      { signal: this.signals[i++].signal },
    );
  }

  // Returns true if the key was pressed and is still down
  isDown(key: string) {
    return this.keysDown.has(key);
  }

  // Returns true if the key was pressed this frame
  wasPressed(key: string) {
    return this.keysPressed.has(key);
  }

  // Returns true if the key was released this frame
  wasReleased(key: string) {
    return this.keysReleased.has(key);
  }

  update() {
    if (this.pressedBuffer.size > 0) {
      this.pressedBuffer.forEach((k) => this.keysPressed.add(k));
    } else {
      this.keysPressed.clear();
    }
    this.pressedBuffer.clear();
    if (this.releasedBuffer.size > 0) {
      this.releasedBuffer.forEach((k) => this.keysReleased.add(k));
    } else {
      this.keysReleased.clear();
    }
    this.releasedBuffer.clear();
  }

  reset(canvas: HTMLCanvasElement) {
    this.keysDown.clear();
    this.keysReleased.clear();
    this.keysPressed.clear();
    this.signals.forEach((signal) => signal.abort());
    this.init(canvas);
  }
}
