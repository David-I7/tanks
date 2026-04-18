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
        if (game.input.mouse.hasMouseMoved()) {
            const moves = game.input.mouse.getMouseMoves();
            const lastMove = moves[0];
            const mx = lastMove.x;
            const my = lastMove.y;
            const tx = this.x + this.image.width;
            const ty = this.y;
            const dx = mx - tx;
            const dy = my - ty;
            const angle = Math.atan2(-dy, dx);
            const distance = Math.sqrt(dx * dx + dy * dy);
            const power = Math.min(distance * 2, 800);
            console.log(`Angle: ${angle}; Power: ${power}; Distance: ${distance}`);
            if (game.input.mouse.wasClicked()) {
                this.projectiles.push(new Projectile(this.x + this.image.width, this.y, angle, power));
            }
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
