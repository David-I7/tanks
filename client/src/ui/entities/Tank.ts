import Terrain from "./Terrain.js";
import { InputManager } from "../../input/InputManager.js";
import Camera from "../../ui/Camera.js";
import { GAME_CONFIG } from "../../config/gameConfig.js";
import Animatable from "../../interfaces/Animatable.js";
import Drawable from "../../interfaces/Drawable.js";
import { toRadians } from "../../utils/game.js";
import Projectile from "./Projectile.js";

export default class Tank implements Animatable, Drawable {
  private terrain: Terrain;
  private input: InputManager;
  private camera: Camera;
  private projectile: Projectile;

  private projectileLaunched = false;

  x: number = 50;
  y: number;

  private angle: number = 0;
  // 75 degrees in radians
  private MAX_ANGLE = toRadians(75);

  constructor(
    private image: ImageBitmap,
    terrain: Terrain,
    input: InputManager,
    camera: Camera,
  ) {
    this.terrain = terrain;
    this.input = input;
    this.camera = camera;
    this.y = this.terrain.getSurfaceY(this.x, 0);
    const slope = this.terrain.getSlopeVector(this.x);
    this.angle = Math.atan2(slope.y, slope.x);
    this.projectile = new Projectile(
      this.x + this.image.width / 2,
      this.y - this.image.height / 2,
      0,
      0,
      this.terrain,
      camera.width,
      camera.height,
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

  private calculateNextXPosition(dt: number): number {
    let input = 0;

    if (this.input.keyboard.isHeld("a") && this.input.keyboard.isHeld("d"))
      input = 0;
    else if (this.input.keyboard.isHeld("a")) input = -1;
    else if (this.input.keyboard.isHeld("d")) input = 1;

    if (input === -1 && this.angle >= this.MAX_ANGLE) return this.x;
    else if (input === 1 && this.angle <= -this.MAX_ANGLE) return this.x;

    return Math.max(0, Math.min(this.terrain.width, this.x + input * 100 * dt));
  }

  getMouseWorld(x: number, y: number) {
    return {
      x: this.camera.x + x / this.camera.zoom,
      y: this.camera.y + y / this.camera.zoom,
    };
  }

  update(dt: number): void {
    let nextX = this.calculateNextXPosition(dt);

    if (nextX !== this.x) {
      this.x = nextX;

      const groundY = this.terrain.getSurfaceY(this.x, 0);
      this.y = groundY;

      const n = this.terrain.getSlopeVector(this.x);
      //this.normal = n;
      this.angle = Math.atan2(n.y, n.x);
    }

    if (this.input.mouse.hasMouseMoved() && !this.projectileLaunched) {
      const moves = this.input.mouse.getMouseMoves();

      const lastMove = moves[moves.length - 1];

      const mx = lastMove.cameraX;
      const my = lastMove.cameraY;

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

    if (this.input.mouse.wasClicked() && !this.projectileLaunched) {
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
