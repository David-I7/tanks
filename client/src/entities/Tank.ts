import game from "../Game.js";
import Animatable from "../interfaces/animatable";
import Projectile from "./Projectile.js";

export default class Tank implements Animatable {
  private projectile: Projectile;

  private projectileLaunched = false;

  private x: number = 50;
  private y: number;

  private angle: number = 0;
  private MAX_SLOPE = 0.7;

  constructor(private image: ImageBitmap) {
    this.y = game.terrain.getSurfaceY(this.x, 0);
    const n = game.terrain.getNormal(this.x);
    this.angle = Math.atan2(n.ny, n.nx) - Math.PI / 2;
    this.projectile = new Projectile(
      this.x + this.image.width / 2,
      this.y - this.image.height / 2,
      0,
      0,
    );
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.drawImage(this.image, -this.image.width / 2, -this.image.height);

    ctx.restore();

    if (this.projectileLaunched) {
      this.projectile.draw(ctx);
    } else {
      this.projectile.drawTrajectory(ctx);
    }
  }

  update(dt: number): void {
    let input = 0;

    if (game.input.keyboard.isHeld("a") && game.input.keyboard.isHeld("d"))
      input = 0;
    else if (game.input.keyboard.isHeld("a")) input = -1;
    else if (game.input.keyboard.isHeld("d")) input = 1;

    if (input !== 0) {
      this.x += input * 100 * dt;
      this.x = Math.max(0, Math.min(game.terrain.width, this.x));

      const groundY = game.terrain.getSurfaceY(this.x, 0);
      this.y = groundY;

      const n = game.terrain.getNormal(this.x);
      this.angle = Math.atan2(n.ny, n.nx) - Math.PI / 2;
    }

    if (game.input.mouse.hasMouseMoved() && !this.projectileLaunched) {
      const moves = game.input.mouse.getMouseMoves();

      const lastMove = moves[moves.length - 1];

      const mx = lastMove.x;
      const my = lastMove.y;

      const tx = this.x + this.image.width;
      const ty = this.y;

      const dx = mx - tx;
      const dy = my - ty;

      const magnitude = Math.sqrt(dx * dx + dy * dy);

      const power = Math.min(magnitude * 2, 600);

      this.projectile.vx = (dx / magnitude) * power;
      this.projectile.vy = (dy / magnitude) * power;
    }

    if (!this.projectileLaunched) {
      this.projectile.x = this.x + this.image.width / 2;
      this.projectile.y = this.y - this.image.width / 2;
    }

    if (game.input.mouse.wasClicked() && !this.projectileLaunched) {
      this.projectileLaunched = true;
    }

    if (this.projectileLaunched) {
      this.projectile.update(dt);
      if (this.projectile.done) {
        this.projectileLaunched = false;
        this.projectile.done = false;
      }
    }
  }
}
