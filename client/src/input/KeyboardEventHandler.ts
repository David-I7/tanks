export default class KeyboardEventHandler {
  private keysDown: Set<string> = new Set();
  private frameKeys: Set<string> = new Set();
  private signals!: AbortController[];

  constructor() {
    this.init();
  }

  private init() {
    this.signals = Array.from({ length: 2 }, (_) => new AbortController());

    let i = 0;
    window.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        this.keysDown.add(e.code);
        if (!e.repeat) {
          this.frameKeys.add(e.code);
        }
      },
      { signal: this.signals[i++].signal },
    );
    window.addEventListener(
      "keyup",
      (e) => {
        this.keysDown.delete(e.code);
      },
      { signal: this.signals[i++].signal },
    );
  }

  // Returns true if the key was pressed and is still down (multiple frames)
  isDown(key: string) {
    return this.keysDown.has(key);
  }

  // Returns true if the key was pressed this frame
  wasPressed(key: string) {
    return this.frameKeys.has(key);
  }

  update() {
    this.frameKeys.clear();
  }

  reset() {
    this.keysDown = new Set();
    this.frameKeys = new Set();
    this.signals.forEach((signal) => signal.abort());
    this.init();
  }
}
