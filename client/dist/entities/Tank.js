import game from "../Game.js";
import Projectile from "./Projectile.js";
export default class Tank {
    image;
    angle = 0;
    projectiles = [];
    x = 50;
    y;
    constructor(image) {
        this.image = image;
        this.y = game.settings.viewport.height - this.image.height;
    }
    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y);
        this.projectiles.forEach((projectile) => projectile.draw(ctx));
    }
    update(dt) {
        // console.log(game.input.mouse.getMouse());
        if (game.input.mouse.isDown()) {
            this.projectiles.push(new Projectile(this.x + this.image.width, this.y, 45, 10));
        }
        this.projectiles.forEach((projectile) => projectile.update(dt));
    }
}
