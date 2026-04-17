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
        if (game.input.mouseGestures.wasPressed()) {
            this.projectiles.push(new Projectile(this.x + this.image.width, this.y, 45, 500));
        }
        for (let i = 0; i < this.projectiles.length; ++i) {
            const projectile = this.projectiles[i];
            if (projectile.done) {
                this.projectiles.splice(i, 1);
                i--;
                continue;
            }
            projectile.update(dt);
        }
    }
}
