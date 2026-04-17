type KeyEventType = "down" | "up";

interface CanvasKeyboardEvent {
  type: KeyEventType;
  code: string;
  time: number;
}

export default class KeyboardInput {
  private queue: CanvasKeyboardEvent[] = [];

  private down: CanvasKeyboardEvent[] = [];
  private up: CanvasKeyboardEvent[] = [];

  private keysDown: Set<string> = new Set();

  constructor() {
    window.addEventListener("keydown", (e) => {
      this.queue.push({
        type: "down",
        code: e.code,
        time: performance.now(),
      });
    });

    window.addEventListener("keyup", (e) => {
      this.queue.push({
        type: "up",
        code: e.code,
        time: performance.now(),
      });
    });
  }

  update() {
    this.down.length = 0;
    this.up.length = 0;

    for (const ev of this.queue) {
      if (ev.type === "down") {
        this.keysDown.add(ev.code);
        this.down.push(ev);
      }

      if (ev.type === "up") {
        this.keysDown.delete(ev.code);
        this.up.push(ev);
      }
    }

    this.queue.length = 0;
  }

  isDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  wasPressed(code: string): boolean {
    return this.down.some((e) => e.code === code);
  }

  wasReleased(code: string): boolean {
    return this.up.some((e) => e.code === code);
  }

  getPressedKeys(): readonly CanvasKeyboardEvent[] {
    return this.down;
  }

  getReleasedKeys(): readonly CanvasKeyboardEvent[] {
    return this.up;
  }
}
