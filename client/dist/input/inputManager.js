import { KeyboardInput, KeyboardGestures } from "./KeyboardInput.js";
import { MouseInput, MouseGestures } from "./MouseInput.js";
export class InputManager {
    keyboard;
    keyboardInput;
    mouse;
    mouseInput;
    canvas;
    constructor(canvas) {
        this.canvas = canvas;
        this.mouseInput = new MouseInput(canvas);
        this.mouse = new MouseGestures(this.mouseInput);
        this.keyboardInput = new KeyboardInput();
        this.keyboard = new KeyboardGestures(this.keyboardInput);
    }
    update() {
        this.mouseInput.update();
        this.mouse.update();
        this.keyboard.update();
    }
}
