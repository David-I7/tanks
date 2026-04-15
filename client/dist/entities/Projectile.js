export default class Projectile {
    x;
    y;
    vx;
    vy;
    radius = 3;
    constructor(x, y, angle, speed) {
        this.x = x;
        this.y = y;
        // convert degrees → radians
        const rad = (angle * Math.PI) / 180;
        this.vx = Math.cos(rad) * speed;
        this.vy = Math.sin(rad) * speed;
    }
    update(dt) {
        const gravity = 500; // px/s² (tune this)
        this.vy += gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
    }
}
