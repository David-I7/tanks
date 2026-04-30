import { InputManager } from "./input/InputManager.js";
import { GAME_CONFIG } from "./config/gameConfig.js";
import Terrain from "./entities/Terrain.js";
import ResourceManager from "./ResourceManager.js";

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("canvas1") as HTMLCanvasElement;
  const CANVAS_WIDTH = (canvas.width = window.innerWidth);
  const CANVAS_HEIGHT = (canvas.height = window.innerHeight);

  const inputManger = new InputManager(CANVAS_WIDTH, CANVAS_HEIGHT, canvas);

  GAME_CONFIG.camera.height = CANVAS_HEIGHT;
  GAME_CONFIG.camera.width = CANVAS_WIDTH;
  GAME_CONFIG.camera.dpi = window.devicePixelRatio;

  GAME_CONFIG.game.height = CANVAS_HEIGHT;
  GAME_CONFIG.game.width = CANVAS_WIDTH * 3;

  const resources = await ResourceManager.load();

  let lastTime = 0;

  const terrain = new Terrain(CANVAS_WIDTH, CANVAS_HEIGHT);

  function animate(timestamp: number) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    inputManger.update();

    requestAnimationFrame(animate);
  }
  animate(0);
});
