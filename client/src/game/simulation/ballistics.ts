import type { GameState } from "../types";

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
  snapshot: GameState,
  playerId: number,
  maxPoints = 90,
): TrajectoryPoint[] {
  const activeTank = snapshot.tanks.find(
    (entry) => entry.playerId === playerId && entry.alive,
  );
  if (!activeTank) return [];

  const muzzle = getMuzzlePosition(
    activeTank.position.x,
    activeTank.position.y,
    activeTank.aimAngle,
  );
  const slot = activeTank.loadout.find(
    (entry) => entry.id === activeTank.selectedProjectileSlotId,
  );
  const projectileDefinition = slot
    ? snapshot.projectileDefinitions[slot.projectileDefinitionId]
    : null;
  const physics = projectileDefinition?.physics ?? {
    radius: 4,
    gravityScale: 1,
    drag: 0,
    muzzleVelocityScale: 1,
  };
  const velocity = {
    x:
      Math.cos(activeTank.aimAngle) *
      activeTank.power *
      physics.muzzleVelocityScale,
    y:
      Math.sin(activeTank.aimAngle) *
      activeTank.power *
      physics.muzzleVelocityScale,
  };
  const points: TrajectoryPoint[] = [];
  const dt = 1 / 18;
  let x = muzzle.x;
  let y = muzzle.y;
  let vx = velocity.x;
  let vy = velocity.y;

  for (let i = 0; i < maxPoints; i += 1) {
    vx *= Math.max(0, 1 - physics.drag * dt);
    vy *= Math.max(0, 1 - physics.drag * dt);
    vy += GRAVITY * physics.gravityScale * dt;
    x += vx * dt;
    y += vy * dt;

    if (
      snapshot.terrain.kind !== "heightmap" ||
      x < 0 ||
      x >= snapshot.terrain.width ||
      y > snapshot.terrain.height
    ) {
      break;
    }
    points.push({ x, y });

    const surfaceY =
      snapshot.terrain.surface[
        Math.max(0, Math.min(snapshot.terrain.width - 1, Math.floor(x)))
      ] ?? Infinity;
    if (y + physics.radius >= surfaceY) break;
  }

  return points;
}
