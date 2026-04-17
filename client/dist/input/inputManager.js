import KeyboardEventHandler from "./KeyboardEventHandler.js";
import { MouseInput, MouseGestures } from "./Mouse.js";
export class InputManager {
    keyboard;
    mouseGestures;
    mouseInput;
    canvas;
    constructor(canvas) {
        this.canvas = canvas;
        this.mouseInput = new MouseInput(canvas);
        this.mouseGestures = new MouseGestures(this.mouseInput);
        this.keyboard = new KeyboardEventHandler(canvas);
    }
    update() {
        this.mouseInput.update();
        this.mouseGestures.update();
        this.keyboard.update();
    }
}
