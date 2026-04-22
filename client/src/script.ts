import Tank from "./ui/entities/Tank.js";
import Game from "./Game.js";
import Camera from "./ui/Camera.js";
import Renderer from "./rendering/Renderer.js";
import { InputManager } from "./input/InputManager.js";

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("canvas1") as HTMLCanvasElement;
  const CANVAS_WIDTH = (canvas.width = window.innerWidth);
  const CANVAS_HEIGHT = (canvas.height = window.innerHeight);

  const camera = new Camera(CANVAS_WIDTH, CANVAS_HEIGHT);
  const inputMangaer = new InputManager(canvas, camera);
  const renderer = new Renderer(canvas, camera);
  const game = new Game(renderer, inputMangaer);

  game.settings.viewport.height = CANVAS_HEIGHT;
  game.settings.viewport.width = CANVAS_WIDTH;
  game.settings.viewport.dpi = window.devicePixelRatio;

  await game.init();

  let lastTime = 0;

  function animate(timestamp: number) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    game.update(dt);
    game.render();

    requestAnimationFrame(animate);
  }
  animate(0);
});
