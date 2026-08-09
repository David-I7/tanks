import type { GameState } from "../types";

export const GRAVITY = 500;
export const MUZZLE_OFFSET = 18;
export const MUZZLE_Y_OFFSET = -12;

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
  _angle: number,
  facing: 1 | -1 = 1,
  width = 36,
  height = 24,
): TrajectoryPoint {
  const muzzleForwardOffset = width / 2.0;
  const muzzleVerticalOffset = height / 2.0;
  return {
    x: tankX + facing * muzzleForwardOffset,
    y: tankY - muzzleVerticalOffset,
  };
}

export function simulateTrajectoryPreview(
  snapshot: GameState,
  playerId: number,
  maxPoints = 180,
): TrajectoryPoint[] {
  const activeTank = snapshot.tanks.find(
    (entry) => entry.playerId === playerId && entry.alive,
  );
  if (!activeTank) return [];

  const slotId =
    activeTank.loadout.find(
      (id) => id === activeTank.selectedProjectileSlotId,
    ) || activeTank.loadout[0];

  const projectileDef = slotId
    ? snapshot.projectileDefinitions[slotId]
    : null;

  const baseVel = projectileDef?.baseVelocity ?? 600;
  const gravityScale = projectileDef?.gravityScale ?? 1;
  const drag = projectileDef?.drag ?? 0;

  const facing = activeTank.facing ?? 1;
  const muzzleForwardOffset = activeTank.width ? activeTank.width / 2.0 : 18;
  const muzzleVerticalOffset = activeTank.height ? activeTank.height / 2.0 : 12;

  const launchX = activeTank.position.x + facing * muzzleForwardOffset;
  const launchY = activeTank.position.y - muzzleVerticalOffset;

  const rawAngle = activeTank.aimAngle;
  const angleRad =
    Math.abs(rawAngle) > 2 * Math.PI
      ? (rawAngle * Math.PI) / 180
      : rawAngle;

  const speed = activeTank.power * baseVel;
  let currVx = facing * speed * Math.cos(angleRad);
  let currVy = -speed * Math.sin(angleRad);

  const g = GRAVITY * gravityScale;
  const wind = snapshot.match.wind ?? 0;
  const dt = 1 / 30;

  const points: TrajectoryPoint[] = [{ x: launchX, y: launchY }];
  let currX = launchX;
  let currY = launchY;

  const width =
    snapshot.terrain.kind === "heightmap" ? snapshot.terrain.width : 2400;

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
      const surfaceY =
        snapshot.terrain.surface[
          Math.max(0, Math.min(width - 1, Math.floor(currX)))
        ] ?? Infinity;
      if (currY >= surfaceY) {
        points.push({ x: currX, y: Math.min(surfaceY, currY) });
        break;
      }
    }

    points.push({ x: currX, y: currY });
  }

  return points;
}
