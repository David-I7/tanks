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
  bodyAngle: number,
  turretYOffset: number,
  barrelLength: number,
): TrajectoryPoint {
  // Pivot point around which the turret rotates, shifted by the tank body tilt
  const pivotX = tankX - turretYOffset * Math.sin(bodyAngle);
  const pivotY = tankY + turretYOffset * Math.cos(bodyAngle);

  // Muzzle endpoint calculated directly along the aimAngle from the pivot
  const muzzleX = pivotX + Math.cos(aimAngle) * barrelLength;
  const muzzleY = pivotY + Math.sin(aimAngle) * barrelLength;

  return { x: muzzleX, y: muzzleY };
}

export function simulateTrajectoryPreview(
  snapshot: GameState,
  playerId: number,
  maxPoints: number,
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
  const baseVelocity = projectileDef ? projectileDef.baseVelocity : 1.0;

  const rawAngle = activeTank.aimAngle;
  const angleRad = clampAimAngle(rawAngle);

  let barrelLength = BARREL_LENGTH;
  let turretYOffset = TURRET_Y_OFFSET;
  let worldGravity = 260;
  let dt = 1 / 30;

  if (ResourceManager.getInstance().isLoaded()) {
    const content = ResourceManager.getInstance().getGameContent();
    const tankDef = content.tanks[activeTank.tankDefinitionId];
    if (tankDef) {
      barrelLength = tankDef.barrelLength;
      turretYOffset = tankDef.turretYOffset;
    }
    worldGravity = content.world.gravity;
    dt = content.world.projectileTimeStepSeconds;
  }

  const muzzle = getMuzzlePosition(
    activeTank.position.x,
    activeTank.position.y,
    angleRad,
    activeTank.bodyAngle,
    turretYOffset,
    barrelLength,
  );

  const speed = activeTank.power * baseVelocity;
  let currVx = speed * Math.cos(angleRad);
  let currVy = speed * Math.sin(angleRad);

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
