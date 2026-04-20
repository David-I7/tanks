import { SIXTY_FPS } from "../constants.js";
import game from "../Game.js";
import Animatable from "../interfaces/animatable";

export default class Projectile implements Animatable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 3;
  done: boolean = false;
  gravity: number = 500; // px/s²

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;

    this.vx = vx;
    this.vy = vy;
  }

  drawTrajectory(ctx: CanvasRenderingContext2D) {
    let x = this.x;
    let y = this.y;
    let vx = this.vx;
    let vy = this.vy;

    let step = 5;

    const prevFillStyle = ctx.fillStyle;

    for (let i = 1; i <= 100; i++) {
      // number of preview steps
      vy += this.gravity * SIXTY_FPS;

      x += vx * SIXTY_FPS;
      y += vy * SIXTY_FPS;

      // stop if it goes off screen
      if (
        y >= game.settings.viewport.height ||
        x >= game.settings.viewport.width ||
        x <= 0
      ) {
        break;
      }

      if (game.terrain.intersects(x, y)) break;

      if (i % step == 0) {
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fill();
      }
    }

    ctx.fillStyle = prevFillStyle;
  }

  update(dt: number): void {
    if (this.done) return;

    // const prevX = this.x;
    // const prevY = this.y;

    this.vy += this.gravity * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (game.terrain.intersectsCircle(this.x, this.y, this.radius)) {
      game.terrain.destroy(this.x, this.y, 25);
      this.done = true;
      return;
    }

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
