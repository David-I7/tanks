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
    //private rect!: DOMRect;
    //private observer!: ResizeObserver;
    signals;
    constructor(canvas) {
        this.init(canvas);
    }
    init(canvas) {
        this.signals = Array.from({ length: 4 }, (_) => new AbortController());
        // this.observer = new ResizeObserver(() => {
        //   this.rect = canvas.getBoundingClientRect();
        // });
        // this.observer.observe(canvas);
        // const getPos = (e: MouseEvent) => {
        //   return {
        //     x: e.clientX - this.rect.x,
        //     y: e.clientY - this.rect.y,
        //   };
        // };
        let i = 0;
        canvas.addEventListener("mousedown", (e) => {
            this.buffer.pressed = true;
            this.mouse.isDown = true;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        }, { signal: this.signals[i++].signal });
        canvas.addEventListener("mousemove", (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        }, { signal: this.signals[i++].signal });
        canvas.addEventListener("mouseup", (e) => {
            console.log(e);
            console.log("mouse up");
            // We do not set buffer.pressed to false because we still want to register the fact that the mouse was pressed
            this.buffer.released = true;
            this.mouse.isDown = false;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        }, { signal: this.signals[i++].signal });
        canvas.addEventListener("mouseleave", (e) => {
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
    reset(canvas) {
        this.mouse = {
            x: 0,
            y: 0,
            pressed: false,
            isDown: false,
            released: false,
            moved: false,
        };
        this.signals.forEach((signal) => signal.abort());
        //this.observer.disconnect();
        this.init(canvas);
    }
}
// export class _MouseEventHandler implements InputEventHandler {
//   private signals!: AbortController[];
//   private queue: CanvasMouseEvent[] = [];
//   private down: CanvasMouseEvent[] = [];
//   private up: CanvasMouseEvent[] = [];
//   private move: CanvasMouseEvent[] = [];
//   private leave: CanvasMouseEvent[] = [];
//   private rect!: DOMRect;
//   private observer!: ResizeObserver;
//   constructor(canvas: HTMLCanvasElement) {
//     this.init(canvas);
//   }
//   private init(canvas: HTMLCanvasElement) {
//     this.signals = Array.from({ length: 4 }, (_) => new AbortController());
//     this.observer = new ResizeObserver(() => {
//       this.rect = canvas.getBoundingClientRect();
//     });
//     this.observer.observe(canvas);
//     const getPos = (e: MouseEvent) => {
//       return {
//         x: e.clientX - this.rect.x,
//         y: e.clientY - this.rect.y,
//       };
//     };
//     let i = 0;
//     canvas.addEventListener(
//       "mousedown",
//       (e) => {
//         this.queue.push({ type: "down",...getPos(e)});
//       },
//       { signal: this.signals[i++].signal },
//     );
//     canvas.addEventListener(
//       "mousemove",
//       (e) => {
//         //console.log(e);
//         // this.buffer.pressed = true;
//         // this.mouse.isDown = true;
//         this.mouse.x = e.clientX;
//         this.mouse.y = e.clientY;
//       },
//       { signal: this.signals[i++].signal },
//     );
//     canvas.addEventListener(
//       "mouseup",
//       (e) => {
//         console.log(e);
//         console.log("mouse up");
//         // We do not set buffer.pressed to false because we still want to register the fact that the mouse was pressed
//         this.buffer.released = true;
//         this.mouse.isDown = false;
//         this.mouse.x = e.clientX;
//         this.mouse.y = e.clientY;
//       },
//       { signal: this.signals[i++].signal },
//     );
//     canvas.addEventListener(
//       "mouseleave",
//       (e) => {
//         this.buffer.released = true;
//         this.mouse.isDown = false;
//         this.mouse.x = e.clientX;
//         this.mouse.y = e.clientY;
//       },
//       { signal: this.signals[i++].signal },
//     );
//   }
//   getMouse(): typeof this.mouse {
//     return this.mouse;
//   }
//   isDown(): boolean {
//     return this.mouse.isDown;
//   }
//   wasMoved(): boolean {
//     return this.buffer.moved;
//   }
//   wasPressed(): boolean {
//     return this.mouse.pressed;
//   }
//   wasReleased(): boolean {
//     return this.mouse.released;
//   }
//   update() {}
//   reset(canvas: HTMLCanvasElement) {
//     this.signals.forEach((signal) => signal.abort());
//     this.observer.disconnect();
//     this.init(canvas);
//   }
// }
