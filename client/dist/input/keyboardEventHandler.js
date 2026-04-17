export default class KeyboardEventHandler {
    keysDown = new Set();
    keysPressed = new Set();
    keysReleased = new Set();
    pressedBuffer = new Set();
    releasedBuffer = new Set();
    signals;
    constructor(canvas) {
        this.init(canvas);
    }
    init(canvas) {
        this.signals = Array.from({ length: 2 }, (_) => new AbortController());
        let i = 0;
        window.addEventListener("keydown", (e) => {
            this.keysDown.add(e.code);
            if (!e.repeat) {
                this.pressedBuffer.add(e.code);
            }
        }, { signal: this.signals[i++].signal });
        window.addEventListener("keyup", (e) => {
            this.keysDown.delete(e.code);
            this.releasedBuffer.add(e.code);
        }, { signal: this.signals[i++].signal });
    }
    // Returns true if the key was pressed and is still down
    isDown(key) {
        return this.keysDown.has(key);
    }
    // Returns true if the key was pressed this frame
    wasPressed(key) {
        return this.keysPressed.has(key);
    }
    // Returns true if the key was released this frame
    wasReleased(key) {
        return this.keysReleased.has(key);
    }
    update() {
        if (this.pressedBuffer.size > 0) {
            this.pressedBuffer.forEach((k) => this.keysPressed.add(k));
        }
        else {
            this.keysPressed.clear();
        }
        this.pressedBuffer.clear();
        if (this.releasedBuffer.size > 0) {
            this.releasedBuffer.forEach((k) => this.keysReleased.add(k));
        }
        else {
            this.keysReleased.clear();
        }
        this.releasedBuffer.clear();
    }
    reset(canvas) {
        this.keysDown.clear();
        this.keysReleased.clear();
        this.keysPressed.clear();
        this.signals.forEach((signal) => signal.abort());
        this.init(canvas);
    }
}
