import { SIXTY_FPS } from "../constants.js";
import Terrain from "../entities/Terrain.js";

export default class ProjectilePhysics {
  static simulateTrajectory(
    x: number,
    y: number,
    vx: number,
    vy: number,
    gravity: number,
    terrain: Terrain,
    viewportWidth: number,
    viewportHeight: number,
    steps: number = 100,
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    let currentX = x;
    let currentY = y;
    let currentVx = vx;
    let currentVy = vy;

    for (let i = 1; i <= steps; i++) {
      currentVy += gravity * SIXTY_FPS;
      currentX += currentVx * SIXTY_FPS;
      currentY += currentVy * SIXTY_FPS;

      // stop if it goes off screen
      if (
        currentY >= viewportHeight ||
        currentY <= 0 ||
        currentX >= viewportWidth ||
        currentX <= 0
      ) {
        break;
      }

      if (terrain.intersects(currentX, currentY)) break;

      if (i % 5 == 0) {
        // every 5th point or something
        points.push({ x: currentX, y: currentY });
      }
    }

    return points;
  }
}
