import type { GameState } from "../types";
import { ResourceManager } from "../rendering/ResourceManager";

export const BARREL_LENGTH = 28;
export const TURRET_Y_OFFSET = -14;

export function clampAimAngle(angle: number): number {
  if (Math.abs(angle) > 2 * Math.PI) {
    if (angle < 0) {
      const clamped = Math.max(-180, Math.min(angle, 0));
      return (clamped * Math.PI) / 180;
    } else {
      const clamped = Math.max(0, Math.min(angle, 180));
      return (-clamped * Math.PI) / 180;
    }
  }

  if (angle > 0) {
    return angle <= Math.PI / 2 ? 0 : -Math.PI;
  }
  if (angle < -Math.PI) {
    return -Math.PI;
  }
  return angle;
}

export type TrajectoryPoint = {
  x: number;
  y: number;
};

export function getMuzzlePosition(
  tankX: number,
  tankY: number,
  aimAngle: number,
  bodyAngle = 0,
  turretYOffset = TURRET_Y_OFFSET,
  barrelLength = BARREL_LENGTH,
): TrajectoryPoint {
  const pivotX = tankX - turretYOffset * Math.sin(bodyAngle);
  const pivotY = tankY + turretYOffset * Math.cos(bodyAngle);
  return {
    x: pivotX + Math.cos(aimAngle) * barrelLength,
    y: pivotY + Math.sin(aimAngle) * barrelLength,
  };
}

export function simulateTrajectoryPreview(
  snapshot: GameState,
  playerId: number,
  maxPoints = 300,
): TrajectoryPoint[] {
  const activeTank = snapshot.tanks.find(
    (entry) => entry.playerId === playerId && entry.alive,
  );
  if (!activeTank) return [];

  const slotId =
    activeTank.selectedProjectileSlotId || activeTank.loadout[0];

  const projectileDef = slotId
    ? snapshot.projectileDefinitions[slotId]
    : undefined;

  const gravityScale = projectileDef ? projectileDef.gravityScale : 1;
  const drag = projectileDef ? projectileDef.drag : 0;
  const baseVelocity = projectileDef ? projectileDef.baseVelocity : 1.0;

  const rawAngle = activeTank.aimAngle;
  const angleRad = clampAimAngle(rawAngle);

  const muzzle = getMuzzlePosition(
    activeTank.position.x,
    activeTank.position.y,
    angleRad,
    activeTank.bodyAngle ?? 0,
  );

  const speed = activeTank.power * baseVelocity;
  let currVx = speed * Math.cos(angleRad);
  let currVy = speed * Math.sin(angleRad);

  let worldGravity = 260;
  let dt = 1 / 30;
  if (ResourceManager.getInstance().isLoaded()) {
    const worldContent = ResourceManager.getInstance().getGameContent().world;
    worldGravity = worldContent.gravity;
    dt =
      worldContent.projectileTimeStepSeconds ||
      1 / (worldContent.tickRateHz || 30);
  }

  const g = worldGravity * gravityScale;
  const wind = snapshot.match.wind;

  const points: TrajectoryPoint[] = [{ x: muzzle.x, y: muzzle.y }];
  let currX = muzzle.x;
  let currY = muzzle.y;

  const width = snapshot.terrain.width;

  for (let step = 0; step < maxPoints; step++) {
    currX += currVx * dt;
    currY += currVy * dt;
    currVx += wind * dt;
    currVy += g * dt;

    if (drag > 0) {
      currVx *= 1 - drag * dt;
      currVy *= 1 - drag * dt;
    }

    if (currX < 0 || currX >= width) break;

    if (snapshot.terrain.kind === "heightmap") {
      const clampedX = Math.max(0, Math.min(width - 1, Math.floor(currX)));
      const surfaceY = snapshot.terrain.surface[clampedX];
      if (surfaceY !== undefined && currY >= surfaceY) {
        points.push({ x: currX, y: surfaceY });
        break;
      }
    }

    points.push({ x: currX, y: currY });
  }

  return points;
}
