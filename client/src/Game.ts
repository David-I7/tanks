import { GameSettings, gameSettings } from "./config/gameConfig.js";
import Terrain from "./entities/Terrain.js";
import { InputManager } from "./input/InputManager.js";
import ResourceManager, { Resources } from "./ResourceManager.js";

class Game {
  input!: InputManager;
  settings: GameSettings = gameSettings;
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  resources!: Resources;
  terrain!: Terrain;
  private isDragging: boolean = false;

  constructor() {}

  async init(canvas: HTMLCanvasElement) {
    this.resources = await ResourceManager.load();
    this.terrain = new Terrain(
      this.settings.viewport.width,
      this.settings.viewport.height,
    );
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.input = new InputManager(this.canvas);
  }

  update(dt: number) {
    this.input.update();

    if (this.isDragging) {
      if (this.input.mouse.hasDragMoved()) {
        for (const e of this.input.mouse.getDragMoves()) {
          this.ctx.translate(e.deltaX, 0);
        }
      }
    } else if (this.input.mouse.hasDragStarted()) {
      this.isDragging = true;
    } else {
      this.isDragging = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.terrain.draw(ctx);
  }
}

const game = new Game();

export default game;
