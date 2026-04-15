import KeyboardEventHandler from "./KeyboardEventHandler.js";
import MouseEventHandler from "./MouseEventHandler.js";

export class InputManager {
  keyboard: KeyboardEventHandler = new KeyboardEventHandler();
  mouse: MouseEventHandler = new MouseEventHandler();
  constructor() {}

  update(): void {
    this.mouse.update();
    this.keyboard.update();
  }

  reset(): void {
    this.mouse.reset();
    this.keyboard.reset();
  }
}
