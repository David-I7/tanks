import { InputManager } from "./input/InputManager.js";
const GRAPHICS_URLS = {
    tank: "/assets/graphics/tank.png",
};
class Game {
    graphics = {};
    loaded;
    input = new InputManager();
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
    async load() {
        return new Promise(async (res, rej) => {
            const promises = Object.entries(GRAPHICS_URLS).map(async ([entity, url]) => {
                const image = new Image();
                image.src = url;
                await image.decode();
                this.graphics[entity] = await createImageBitmap(image);
            });
            await Promise.all(promises);
            res(true);
        });
    }
    update(dt) {
        this.input.update();
    }
    draw(ctx) { }
}
const game = new Game();
export default game;
