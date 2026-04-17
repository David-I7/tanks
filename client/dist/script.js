// import Tank from "./entities/Tank.js";
// import game from "./Game.js";
import { MouseGestures, MouseInput } from "./input/MouseInput.js";
// window.addEventListener("DOMContentLoaded", async () => {
//   const canvas = document.getElementById("canvas1") as HTMLCanvasElement;
//   const ctx = canvas.getContext("2d")!;
//   const CANVAS_WIDTH = (canvas.width = window.innerWidth);
//   const CANVAS_HEIGHT = (canvas.height = window.innerHeight);
//   await game.init(canvas);
//   game.settings.viewport.height = CANVAS_HEIGHT;
//   game.settings.viewport.width = CANVAS_WIDTH;
//   game.settings.viewport.dpi = window.devicePixelRatio;
//   let lastTime = 0;
//   const tank = new Tank(game.resources.graphics["tank"]);
//   function animate(timestamp: number) {
//     const dt = (timestamp - lastTime) / 1000;
//     lastTime = timestamp;
//     ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
//     game.update(dt);
//     game.draw(ctx);
//     tank.update(dt);
//     tank.draw(ctx);
//     requestAnimationFrame(animate);
//   }
//   animate(0);
// });
window.addEventListener("DOMContentLoaded", async () => {
    const canvas = document.getElementById("canvas1");
    const ctx = canvas.getContext("2d");
    const CANVAS_WIDTH = (canvas.width = window.innerWidth);
    const CANVAS_HEIGHT = (canvas.height = window.innerHeight);
    const mouseInput = new MouseInput(canvas);
    const mouseGestures = new MouseGestures(mouseInput);
    let lastTime = 0;
    function animate(timestamp) {
        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        mouseInput.update();
        mouseGestures.update();
        if (mouseGestures.hasDragMoved()) {
            console.log("Is dragging");
            console.log(...mouseGestures.getDragMoves());
        }
        if (mouseGestures.hasDragStarted()) {
            console.log("Drag Started");
        }
        if (mouseGestures.hasDragEnded()) {
            console.log("Drag Ended");
        }
        requestAnimationFrame(animate);
    }
    animate(lastTime);
});
