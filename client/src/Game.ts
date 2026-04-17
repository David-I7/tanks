import { GameSettings, gameSettings } from "./config/gameConfig.js";
import { InputManager } from "./input/InputManager.js";
import ResourceManager, { Resources } from "./ResourceManager.js";

class Game {
  input!: InputManager;
  settings: GameSettings = gameSettings;
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  resources!: Resources;

  constructor() {}

  async init(canvas: HTMLCanvasElement) {
    this.resources = await ResourceManager.load();
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.input = new InputManager(this.canvas);
  }

  update(dt: number) {
    this.input.update();
  }

  draw(ctx: CanvasRenderingContext2D) {}
}

const game = new Game();

export default game;
