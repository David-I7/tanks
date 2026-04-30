import { InputEventBuffer } from "../events/InputEventBuffer.js";
import { KeyboardInput, KeyboardGestures } from "./KeyboardInput.js";
import { MouseInput, MouseGestures } from "./MouseInput.js";
import ViewportInput from "./ViewportInput.js";

export class InputManager {
  private keyboard: KeyboardGestures;
  private keyboardInput: KeyboardInput;
  private mouse: MouseGestures;
  private mouseInput: MouseInput;
  private viewportInput: ViewportInput;
  canvas: HTMLCanvasElement;

  constructor(width: number, height: number, canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.viewportInput = new ViewportInput(width, height, canvas);
    this.mouseInput = new MouseInput(canvas, this.viewportInput);
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

  collect(eventBuffer: InputEventBuffer) {
    this.mouse.collect(eventBuffer);
    this.viewportInput.collect(eventBuffer);
    this.keyboard.collect(eventBuffer);
  }
}
