import KeyboardEventHandler from "./KeyboardEventHandler.js";
import MouseEventHandler from "./MouseEventHandler.js";
export class InputManager {
    keyboard = new KeyboardEventHandler();
    mouse = new MouseEventHandler();
    constructor() { }
    update() {
        this.mouse.update();
        this.keyboard.update();
    }
    reset() {
        this.mouse.reset();
        this.keyboard.reset();
    }
}
