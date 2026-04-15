export default class KeyboardEventHandler {
    keysDown = new Set();
    frameKeys = new Set();
    constructor() {
        window.addEventListener("keydown", (e) => {
            this.keysDown.add(e.code);
            if (!e.repeat) {
                this.frameKeys.add(e.code);
            }
        });
        window.addEventListener("keyup", (e) => {
            this.keysDown.delete(e.code);
        });
    }
    // Returns true if the key was pressed and is still down (multiple frames)
    isDown(key) {
        return this.keysDown.has(key);
    }
    // Returns true if the key was pressed this frame
    wasPressed(key) {
        return this.frameKeys.has(key);
    }
    update() {
        this.frameKeys.clear();
    }
    reset() {
        this.keysDown = new Set();
        this.frameKeys = new Set();
    }
}
