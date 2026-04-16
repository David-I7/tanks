export default class MouseEventHandler {
    mouse = {
        x: 0,
        y: 0,
        pressed: false,
        isDown: false,
        released: false,
        moved: false,
    };
    buffer = {
        pressed: false,
        released: false,
        moved: false,
    };
    signals;
    constructor() {
        this.init();
    }
    init() {
        this.signals = Array.from({ length: 4 }, (_) => new AbortController());
        let i = 0;
        window.addEventListener("mousedown", (e) => {
            console.log(e);
            this.buffer.pressed = true;
            this.mouse.isDown = true;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            console.log("down");
        }, { signal: this.signals[i++].signal });
        window.addEventListener("mousemove", (e) => {
            //console.log(e);
            // this.buffer.pressed = true;
            // this.mouse.isDown = true;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        }, { signal: this.signals[i++].signal });
        window.addEventListener("mouseup", (e) => {
            console.log(e);
            console.log("mouse up");
            // We do not set buffer.pressed to false because we still want to register the fact that the mouse was pressed
            this.buffer.released = true;
            this.mouse.isDown = false;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        }, { signal: this.signals[i++].signal });
        window.addEventListener("mouseleave", (e) => {
            this.buffer.released = true;
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
    wasMoved() {
        return this.buffer.moved;
    }
    wasPressed() {
        return this.mouse.pressed;
    }
    wasReleased() {
        return this.mouse.released;
    }
    update() {
        this.mouse.pressed = this.buffer.pressed;
        this.buffer.pressed = false;
        this.mouse.released = this.buffer.released;
        this.buffer.released = false;
        this.mouse.moved = this.buffer.moved;
        this.buffer.moved = false;
    }
    reset() {
        this.mouse = {
            x: 0,
            y: 0,
            pressed: false,
            isDown: false,
            released: false,
            moved: false,
        };
        this.signals.forEach((signal) => signal.abort());
        this.init();
    }
}
