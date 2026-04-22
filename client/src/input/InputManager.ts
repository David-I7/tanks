import Camera from "../ui/Camera.js";
import Viewport from "../ui/Viewport.js";
import { KeyboardInput, KeyboardGestures } from "./KeyboardInput.js";
import { MouseInput, MouseGestures } from "./MouseInput.js";

export class InputManager {
  keyboard: KeyboardGestures;
  private keyboardInput: KeyboardInput;
  mouse: MouseGestures;
  private mouseInput: MouseInput;
  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, viewport: Viewport, camera: Camera) {
    this.canvas = canvas;
    this.mouseInput = new MouseInput(canvas, viewport, camera);
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
