import type { GameSnapshot, ProjectileSlotId } from "../types";

export type ProjectileSelectorLayout = {
  x: number;
  y: number;
  slotSize: number;
  gap: number;
};

export function getProjectileSelectorLayout(
  canvasWidth: number,
  canvasHeight: number,
  slotCount: number,
): ProjectileSelectorLayout {
  const slotSize = Math.max(42, Math.min(64, Math.floor(canvasWidth * 0.045)));
  const gap = 8;
  const totalWidth = slotCount * slotSize + Math.max(0, slotCount - 1) * gap;
  return {
    x: Math.floor((canvasWidth - totalWidth) / 2),
    y: Math.floor(canvasHeight - slotSize - 24),
    slotSize,
    gap,
  };
}

export function findProjectileSlotAtCanvasPoint(
  snapshot: GameSnapshot,
  canvasWidth: number,
  canvasHeight: number,
  canvasX: number,
  canvasY: number,
): ProjectileSlotId | null {
  if (snapshot.match.phase !== "aiming" && snapshot.match.phase !== "thinking") {
    return null;
  }

  const activeTank = snapshot.tanks.find(
    (entry) => entry.tank.playerId === snapshot.match.activePlayerId && entry.tank.alive,
  );
  if (!activeTank) return null;

  const layout = getProjectileSelectorLayout(
    canvasWidth,
    canvasHeight,
    activeTank.tank.loadout.length,
  );

  for (let index = 0; index < activeTank.tank.loadout.length; index += 1) {
    const slot = activeTank.tank.loadout[index];
    if (!slot) continue;
    const slotX = layout.x + index * (layout.slotSize + layout.gap);
    if (
      canvasX >= slotX &&
      canvasX <= slotX + layout.slotSize &&
      canvasY >= layout.y &&
      canvasY <= layout.y + layout.slotSize
    ) {
      return slot.id;
    }
  }

  return null;
}
