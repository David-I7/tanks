import KeyboardInput from "./KeyboardInput.js";
import { MouseInput, MouseGestures } from "./MouseInput.js";

export class InputManager {
  keyboard: KeyboardInput;
  mouse: MouseGestures;
  private mouseInput: MouseInput;
  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.mouseInput = new MouseInput(canvas);
    this.mouse = new MouseGestures(this.mouseInput);
    this.keyboard = new KeyboardInput();
  }

  update(): void {
    this.mouseInput.update();
    this.mouse.update();
    this.keyboard.update();
  }
}
