import { SIXTY_FPS } from "../../constants.js";
import Terrain from "./Terrain.js";
import Animatable from "../../interfaces/Animatable.js";
import ProjectilePhysics from "../../physics/ProjectilePhysics.js";

export default class Projectile implements Animatable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 3;
  done: boolean = false;
  gravity: number = 500; // px/s²
  private terrain: Terrain;
  private viewportWidth: number;
  private viewportHeight: number;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    terrain: Terrain,
    viewportWidth: number,
    viewportHeight: number,
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.terrain = terrain;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  drawTrajectory(ctx: CanvasRenderingContext2D) {
    const points = ProjectilePhysics.simulateTrajectory(
      this.x,
      this.y,
      this.vx,
      this.vy,
      this.gravity,
      this.terrain,
      this.viewportWidth,
      this.viewportHeight,
    );

    const prevFillStyle = ctx.fillStyle;

    for (const point of points) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();
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

    if (this.terrain.intersectsCircle(this.x, this.y, this.radius)) {
      this.terrain.destroy(this.x, this.y, 25);
      this.done = true;
      return;
    }

    if (
      this.y - this.radius >= this.viewportHeight ||
      this.x - this.radius >= this.viewportWidth ||
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
