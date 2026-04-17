import KeyboardInput from "./KeyboardInput.js";
import { MouseInput, MouseGestures } from "./MouseInput.js";
export class InputManager {
    keyboard;
    mouse;
    mouseInput;
    canvas;
    constructor(canvas) {
        this.canvas = canvas;
        this.mouseInput = new MouseInput(canvas);
        this.mouse = new MouseGestures(this.mouseInput);
        this.keyboard = new KeyboardInput();
    }
    update() {
        this.mouseInput.update();
        this.mouse.update();
        this.keyboard.update();
    }
}
