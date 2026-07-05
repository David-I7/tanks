import type { GameSnapshot } from "../types";

export const GRAVITY = 520;
export const MUZZLE_OFFSET = 30;
export const MUZZLE_Y_OFFSET = -22;

export type TrajectoryPoint = {
  x: number;
  y: number;
};

export function getMuzzlePosition(tankX: number, tankY: number, angle: number): TrajectoryPoint {
  return {
    x: tankX + Math.cos(angle) * MUZZLE_OFFSET,
    y: tankY + MUZZLE_Y_OFFSET + Math.sin(angle) * MUZZLE_OFFSET,
  };
}

export function simulateTrajectoryPreview(
  snapshot: GameSnapshot,
  playerId: number,
  maxPoints = 90,
): TrajectoryPoint[] {
  const activeTank = snapshot.tanks.find((entry) => entry.tank.playerId === playerId && entry.tank.alive);
  if (!activeTank) return [];

  const muzzle = getMuzzlePosition(
    activeTank.position.x,
    activeTank.position.y,
    activeTank.tank.aimAngle,
  );
  const velocity = {
    x: Math.cos(activeTank.tank.aimAngle) * activeTank.tank.power,
    y: Math.sin(activeTank.tank.aimAngle) * activeTank.tank.power,
  };
  const points: TrajectoryPoint[] = [];
  const dt = 1 / 18;
  let x = muzzle.x;
  let y = muzzle.y;
  let vx = velocity.x;
  let vy = velocity.y;

  for (let i = 0; i < maxPoints; i += 1) {
    vy += GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;

    if (x < 0 || x >= snapshot.terrain.length || y > Math.max(...snapshot.terrain)) break;
    points.push({ x, y });

    const surfaceY = snapshot.terrain[Math.max(0, Math.min(snapshot.terrain.length - 1, Math.floor(x)))] ?? Infinity;
    if (y >= surfaceY) break;
  }

  return points;
}
