export default class MouseEventHandler {
    mouse = {
        x: 0,
        y: 0,
        pressed: false,
        isDown: false,
    };
    pressedBuffer = false;
    signals;
    constructor() {
        this.init();
    }
    init() {
        this.signals = Array.from({ length: 3 }, (_) => new AbortController());
        let i = 0;
        window.addEventListener("mousedown", (e) => {
            this.pressedBuffer = true;
            this.mouse.isDown = true;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        }, { signal: this.signals[i++].signal });
        window.addEventListener("mouseup", (e) => {
            this.pressedBuffer = false;
            this.mouse.isDown = false;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        }, { signal: this.signals[i++].signal });
        window.addEventListener("mouseleave", (e) => {
            this.pressedBuffer = false;
            this.mouse.isDown = false;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        }, { signal: this.signals[i++].signal });
    }
    getMouse() {
        return this.mouse;
    }
    isDown() {
        return this.mouse.isDown;
    }
    wasPressed() {
        this.mouse.pressed = this.pressedBuffer;
        this.pressedBuffer = false;
        return this.mouse.pressed;
    }
    update() {
        this.mouse.pressed = false;
    }
    reset() {
        this.mouse = {
            x: 0,
            y: 0,
            pressed: false,
            isDown: false,
        };
        this.signals.forEach((signal) => signal.abort());
        this.init();
    }
}
