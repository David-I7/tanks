import { InputEventBuffer } from "../events/InputEventBuffer";

type KeyEventType = "keyType" | "keyRelease" | "keyPress";

interface CanvasKeyboardEvent {
  type: KeyEventType;
  key: string;
  time: number;
}

export class KeyboardInput {
  queue: CanvasKeyboardEvent[] = [];

  keysTyped: CanvasKeyboardEvent[] = [];
  keysPressed: CanvasKeyboardEvent[] = [];
  keysReleased: CanvasKeyboardEvent[] = [];

  keysHeld: Set<string> = new Set();

  constructor() {
    window.addEventListener("keydown", (e) => {
      this.queue.push({
        type: "keyType",
        key: e.key,
        time: performance.now(),
      });
      if (!e.repeat) {
        this.queue.push({
          type: "keyPress",
          key: e.key,
          time: performance.now(),
        });
      }
    });

    window.addEventListener("keyup", (e) => {
      this.queue.push({
        type: "keyRelease",
        key: e.key,
        time: performance.now(),
      });
    });
  }

  update() {
    this.keysTyped.length = 0;
    this.keysReleased.length = 0;
    this.keysPressed.length = 0;

    for (const ev of this.queue) {
      if (ev.type === "keyType") {
        this.keysHeld.add(ev.key);
        this.keysTyped.push(ev);
      }

      if (ev.type === "keyPress") {
        this.keysPressed.push(ev);
      }

      if (ev.type === "keyRelease") {
        this.keysHeld.delete(ev.key);
        this.keysReleased.push(ev);
      }
    }

    this.queue.length = 0;
  }
}

export class KeyboardGestures {
  constructor(private keyboardInput: KeyboardInput) {}

  update() {}

  isHeld(key: string): boolean {
    return this.keyboardInput.keysHeld.has(key);
  }

  // Was typed this frame
  wasTyped(key: string) {
    return this.keyboardInput.keysTyped.some((e) => e.key === key);
  }

  // A press happens only on the first press of a key (!e.repeat), conversly a type happens as long as the key is held down (e.repeat)
  wasPressed(key: string): boolean {
    return this.keyboardInput.keysPressed.some((e) => e.key === key);
  }

  // Was released this frame
  wasReleased(key: string): boolean {
    return this.keyboardInput.keysReleased.some((e) => e.key === key);
  }

  getTypedKeys(): readonly CanvasKeyboardEvent[] {
    return this.keyboardInput.keysTyped;
  }

  getPressedKeys(): readonly CanvasKeyboardEvent[] {
    return this.keyboardInput.keysPressed;
  }

  getReleasedKeys(): readonly CanvasKeyboardEvent[] {
    return this.keyboardInput.keysReleased;
  }

  getKeysHeld() {
    return this.keyboardInput.keysHeld;
  }

  collect(eventBuffer: InputEventBuffer) {
    if (this.getPressedKeys().length > 0) {
      eventBuffer.push(...this.getPressedKeys());
    }

    if (this.getReleasedKeys.length) {
      eventBuffer.push(...this.getReleasedKeys());
    }

    if (this.getTypedKeys.length) {
      eventBuffer.push(...this.getTypedKeys());
    }
  }
}
