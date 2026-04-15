"use strict";
class Pointer {
    pageY = 0;
    pageX = 0;
    id = 0;
    width = 0;
    height = 0;
    clientX = 0;
    clientY = 0;
    constructor(e) {
        this.update(e);
    }
    update(e) {
        this.clientX = e.clientX;
        this.clientY = e.clientY;
        this.pageX = e.pageX;
        this.pageY = e.pageY;
        this.id = e.pointerId;
        this.width = e.width;
        this.height = e.height;
    }
}
class PointerManager {
    touchesDown = {};
    frameTouches = [];
    mousesDown = {};
    frameMouses = [];
    constructor() {
        window.addEventListener("pointerdown", (e) => {
            const pointer = new Pointer(e);
            if (e.type == "mouse") {
                this.mousesDown[e.pointerId] = pointer;
                this.frameMouses.push(pointer);
            }
            else if (e.type == "touch") {
                this.touchesDown[e.pointerId] = pointer;
                this.frameTouches.push(pointer);
            }
        });
        window.addEventListener("pointermove", (e) => {
            if (e.type == "mouse") {
                this.mousesDown[e.pointerId].update(e);
            }
            else if (e.type == "touch") {
                this.touchesDown[e.pointerId].update(e);
            }
        });
        window.addEventListener("pointerup", (e) => {
            console.log(e);
        });
    }
    getTouchesDown() {
        return this.touchesDown;
    }
    getTouchesPressed() {
        return this.frameTouches;
    }
    getMousesDown() {
        return this.mousesDown;
    }
    getMousesPressed() {
        return this.frameMouses;
    }
    update() {
        this.frameMouses = [];
        this.frameTouches = [];
    }
    reset() { }
}
