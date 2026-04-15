import { InputManager } from "./input/InputManager.js";

const GRAPHICS_URLS = {
  tank: "/assets/graphics/tank.png",
};

class Game {
  graphics: Record<string, ImageBitmap> = {};
  loaded: Promise<boolean>;
  input: InputManager = new InputManager();
  settings = {
    viewport: {
      width: 0,
      height: 0,
      dpi: 1,
    },
  };
  constructor() {
    this.loaded = this.load();
  }

  private async load(): Promise<boolean> {
    return new Promise(async (res, rej) => {
      const promises = Object.entries(GRAPHICS_URLS).map(
        async ([entity, url]) => {
          const image = new Image();
          image.src = url;

          await image.decode();

          this.graphics[entity] = await createImageBitmap(image);
        },
      );

      await Promise.all(promises);

      res(true);
    });
  }

  update(dt: number) {
    this.input.update();
  }

  draw(ctx: CanvasRenderingContext2D) {}
}

const game = new Game();

export default game;
