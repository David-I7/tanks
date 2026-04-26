import Tank from "./ui/entities/Tank.js";
import Game from "./Game.js";
import Camera from "./ui/Camera.js";
import Renderer from "./rendering/Renderer.js";
import { InputManager } from "./input/InputManager.js";
import { GAME_CONFIG } from "./config/gameConfig.js";

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("canvas1") as HTMLCanvasElement;
  const CANVAS_WIDTH = (canvas.width = window.innerWidth);
  const CANVAS_HEIGHT = (canvas.height = window.innerHeight);

  const camera = new Camera(CANVAS_WIDTH, CANVAS_HEIGHT);
  const inputManger = new InputManager(canvas, camera);
  const renderer = new Renderer(canvas, camera);
  const game = new Game(renderer, inputManger);

  GAME_CONFIG.camera.height = CANVAS_HEIGHT;
  GAME_CONFIG.camera.width = CANVAS_WIDTH;
  GAME_CONFIG.camera.dpi = window.devicePixelRatio;

  GAME_CONFIG.game.height = CANVAS_HEIGHT;
  GAME_CONFIG.game.width = CANVAS_WIDTH * 3;

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
