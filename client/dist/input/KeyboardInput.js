export default class KeyboardInput {
    queue = [];
    down = [];
    up = [];
    keysDown = new Set();
    constructor() {
        window.addEventListener("keydown", (e) => {
            this.queue.push({
                type: "down",
                code: e.code,
                time: performance.now(),
            });
        });
        window.addEventListener("keyup", (e) => {
            this.queue.push({
                type: "up",
                code: e.code,
                time: performance.now(),
            });
        });
    }
    update() {
        this.down.length = 0;
        this.up.length = 0;
        for (const ev of this.queue) {
            if (ev.type === "down") {
                this.keysDown.add(ev.code);
                this.down.push(ev);
            }
            if (ev.type === "up") {
                this.keysDown.delete(ev.code);
                this.up.push(ev);
            }
        }
        this.queue.length = 0;
    }
    isDown(code) {
        return this.keysDown.has(code);
    }
    wasPressed(code) {
        return this.down.some((e) => e.code === code);
    }
    wasReleased(code) {
        return this.up.some((e) => e.code === code);
    }
    getPressedKeys() {
        return this.down;
    }
    getReleasedKeys() {
        return this.up;
    }
}
