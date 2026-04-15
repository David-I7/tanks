import Tank from "./entities/Tank.js";
import game from "./Game.js";
window.addEventListener("load", async () => {
    const canvas = document.getElementById("canvas1");
    const ctx = canvas.getContext("2d");
    const CANVAS_WIDTH = (canvas.width = window.innerWidth);
    const CANVAS_HEIGHT = (canvas.height = window.innerHeight);
    game.settings.viewport.height = CANVAS_HEIGHT;
    game.settings.viewport.width = CANVAS_WIDTH;
    game.settings.viewport.dpi = window.devicePixelRatio;
    await game.loaded;
    let lastTime = 0;
    const tank = new Tank(game.graphics["tank"]);
    function animate(timestamp) {
        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        game.update(dt);
        game.draw(ctx);
        tank.update(dt);
        tank.draw(ctx);
        requestAnimationFrame(animate);
    }
    animate(0);
});
