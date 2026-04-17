import KeyboardEventHandler from "./KeyboardEventHandler.js";
import { MouseInput, MouseGestures } from "./Mouse.js";

export class InputManager {
  keyboard: KeyboardEventHandler;
  mouseGestures: MouseGestures;
  mouseInput: MouseInput;
  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.mouseInput = new MouseInput(canvas);
    this.mouseGestures = new MouseGestures(this.mouseInput);
    this.keyboard = new KeyboardEventHandler(canvas);
  }

  update(): void {
    this.mouseInput.update();
    this.mouseGestures.update();
    this.keyboard.update();
  }
}
