import Tank from "./entities/Tank.js";
import game from "./Game.js";

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("canvas1") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  const CANVAS_WIDTH = (canvas.width = window.innerWidth);
  const CANVAS_HEIGHT = (canvas.height = window.innerHeight);

  game.settings.viewport.height = CANVAS_HEIGHT;
  game.settings.viewport.width = CANVAS_WIDTH;
  game.settings.viewport.dpi = window.devicePixelRatio;

  await game.init(canvas);

  let lastTime = 0;

  const tank = new Tank(game.resources.graphics["tank"]);
  function animate(timestamp: number) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    ctx.clearRect(
      0,
      0,
      game.settings.viewport.width,
      game.settings.viewport.height,
    );

    game.update(dt);
    game.draw(ctx);

    tank.update(dt);
    tank.draw(ctx);

    requestAnimationFrame(animate);
  }
  animate(0);
});
