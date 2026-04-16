import game from "../Game.js";
import Animatable from "../interfaces/animatable";

export default class Projectile implements Animatable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 3;
  done: boolean = false;

  constructor(x: number, y: number, angle: number, speed: number) {
    this.x = x;
    this.y = y;

    // convert degrees → radians
    const rad = -(angle * Math.PI) / 180;

    this.vx = Math.cos(rad) * speed;
    this.vy = Math.sin(rad) * speed;
  }

  update(dt: number): void {
    const gravity = 300; // px/s² (tune this)

    this.vy += gravity * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (
      this.y - this.radius >= game.settings.viewport.height ||
      this.x - this.radius >= game.settings.viewport.width ||
      this.x + this.radius <= 0
    ) {
      this.done = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
  }
}
