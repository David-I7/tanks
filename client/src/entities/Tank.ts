import game from "../Game.js";
import Animatable from "../interfaces/animatable";
import Projectile from "./Projectile.js";

export default class Tank implements Animatable {
  private angle = 0;
  private projectiles: Projectile[] = [];
  private x: number = 50;
  private y!: number;

  constructor(private image: ImageBitmap) {
    this.y = game.settings.viewport.height - this.image.height;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.image, this.x, this.y);

    this.projectiles.forEach((projectile) => projectile.draw(ctx));
  }

  update(dt: number): void {
    // console.log(game.input.mouse.getMouse());
    if (game.input.mouse.isDown()) {
      this.projectiles.push(
        new Projectile(this.x + this.image.width, this.y, 45, 10),
      );
    }

    this.projectiles.forEach((projectile) => projectile.update(dt));
  }
}
