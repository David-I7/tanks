export class KeyboardInput {
    queue = [];
    keysTyped = [];
    keysPressed = [];
    keysReleased = [];
    keysHeld = new Set();
    constructor() {
        window.addEventListener("keydown", (e) => {
            this.queue.push({
                type: "type",
                key: e.key,
                time: performance.now(),
            });
            if (!e.repeat) {
                this.queue.push({
                    type: "press",
                    key: e.key,
                    time: performance.now(),
                });
            }
        });
        window.addEventListener("keyup", (e) => {
            this.queue.push({
                type: "release",
                key: e.key,
                time: performance.now(),
            });
        });
    }
    update() {
        this.keysTyped.length = 0;
        this.keysReleased.length = 0;
        this.keysPressed.length = 0;
        for (const ev of this.queue) {
            if (ev.type === "type") {
                this.keysHeld.add(ev.key);
                this.keysTyped.push(ev);
            }
            if (ev.type === "press") {
                this.keysPressed.push(ev);
            }
            if (ev.type === "release") {
                this.keysHeld.delete(ev.key);
                this.keysReleased.push(ev);
            }
        }
        this.queue.length = 0;
    }
}
export class KeyboardGestures {
    keyboardInput;
    constructor(keyboardInput) {
        this.keyboardInput = keyboardInput;
    }
    update() { }
    isHeld(code) {
        return this.keyboardInput.keysHeld.has(code);
    }
    // Was typed this frame
    wasTyped(key) {
        return this.keyboardInput.keysTyped.some((e) => e.key === key);
    }
    // A press happens only on the first press of a key (!e.repeat), conversly a type happens as long as the key is held down (e.repeat)
    wasPressed(key) {
        return this.keyboardInput.keysPressed.some((e) => e.key === key);
    }
    // Was released this frame
    wasReleased(key) {
        return this.keyboardInput.keysReleased.some((e) => e.key === key);
    }
    getTypedKeys() {
        return this.keyboardInput.keysTyped;
    }
    getPressedKeys() {
        return this.keyboardInput.keysPressed;
    }
    getReleasedKeys() {
        return this.keyboardInput.keysReleased;
    }
    getKeysHeld() {
        return this.keyboardInput.keysHeld;
    }
}
