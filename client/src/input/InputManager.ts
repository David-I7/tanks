import { KeyboardInput, KeyboardGestures } from "./KeyboardInput.js";
import { MouseInput, MouseGestures } from "./MouseInput.js";

export class InputManager {
  keyboard: KeyboardGestures;
  private keyboardInput: KeyboardInput;
  mouse: MouseGestures;
  private mouseInput: MouseInput;
  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.mouseInput = new MouseInput(canvas);
    this.mouse = new MouseGestures(this.mouseInput);
    this.keyboardInput = new KeyboardInput();
    this.keyboard = new KeyboardGestures(this.keyboardInput);
  }

  update(): void {
    this.mouseInput.update();
    this.mouse.update();
    this.keyboardInput.update();
    this.keyboard.update();
  }
}
