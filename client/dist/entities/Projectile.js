import game from "../Game.js";
export default class Projectile {
    x;
    y;
    vx;
    vy;
    radius = 3;
    done = false;
    constructor(x, y, angle, speed) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }
    update(dt) {
        const gravity = 300; // px/s² (tune this)
        this.vy += gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y - this.radius >= game.settings.viewport.height ||
            this.x - this.radius >= game.settings.viewport.width ||
            this.x + this.radius <= 0) {
            this.done = true;
        }
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
    }
}
