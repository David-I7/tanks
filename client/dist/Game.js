import { gameSettings } from "./config/gameConfig.js";
import { InputManager } from "./input/InputManager.js";
import ResourceManager from "./ResourceManager.js";
class Game {
    input;
    settings = gameSettings;
    canvas;
    ctx;
    resources;
    constructor() { }
    async init(canvas) {
        this.resources = await ResourceManager.load();
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.input = new InputManager(this.canvas);
    }
    update(dt) {
        this.input.update();
    }
    draw(ctx) { }
}
const game = new Game();
export default game;
