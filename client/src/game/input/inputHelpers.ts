import type { GameAction, GameState } from "../types";
import type { DomCanvasRect, GameViewport } from "../world/worldSizing";
import { domPointToGameViewportPoint } from "../world/worldSizing";
import { GRAVITY, getMuzzlePosition } from "../simulation/ballistics";

export type CanvasAimInput = {
  clientX: number;
  clientY: number;
  domCanvasRect: DomCanvasRect;
  gameViewport: GameViewport;
  cameraX: number;
  gameState: GameState;
  activeTank?: GameState["tanks"][number];
};

export function calculateAimIntent(
  input: CanvasAimInput,
): Extract<GameAction, { type: "aim" }> | null {
  const activeTank =
    input.activeTank ??
    input.gameState.tanks.find(
      (entry) =>
        entry.playerId === input.gameState.match.activePlayerId &&
        entry.alive,
    );
  if (!activeTank) return null;

  const point = domPointToGameViewportPoint({
    clientX: input.clientX,
    clientY: input.clientY,
    domCanvasRect: input.domCanvasRect,
    gameViewport: input.gameViewport,
  });
  const worldX = point.x + input.cameraX;
  const worldY = point.y;

  const originX = activeTank.position.x;
  const originY = activeTank.position.y - 22;

  const slot = activeTank.loadout.find(
    (entry) => entry.id === activeTank.selectedProjectileSlotId,
  );
  const projectileDefinition = slot
    ? input.gameState.projectileDefinitions[slot.projectileDefinitionId]
    : null;
  const gravityScale = projectileDefinition?.physics.gravityScale ?? 1;
  const muzzleVelocityScale = projectileDefinition?.physics.muzzleVelocityScale ?? 1;

  // The peak of a parabolic trajectory must be higher (smaller Y value) than the starting height.
  // We clamp the target peakY to be at least 10 pixels above the start point.
  const peakY = Math.min(worldY, originY - 10);
  const g = GRAVITY * gravityScale;
  const dyPeak = originY - peakY;

  // Compute first-pass velocities using the turret base origin
  const vy0 = -Math.sqrt(2 * g * dyPeak);
  const vx0 = (worldX - originX) * Math.sqrt(g / (2 * dyPeak));
  const firstAngle = Math.atan2(vy0, vx0);

  // Refine calculation using the actual muzzle position
  const muzzle = getMuzzlePosition(activeTank.position.x, activeTank.position.y, firstAngle);
  const refinedPeakY = Math.min(worldY, muzzle.y - 10);
  const dyMuzzlePeak = muzzle.y - refinedPeakY;

  const vy = -Math.sqrt(2 * g * dyMuzzlePeak);
  const vx = (worldX - muzzle.x) * Math.sqrt(g / (2 * dyMuzzlePeak));

  const angle = Math.atan2(vy, vx);
  const speed = Math.sqrt(vx * vx + vy * vy);
  const power = speed / muzzleVelocityScale;

  return {
    type: "aim",
    angle,
    power: Math.max(120, Math.min(power, 680)),
  };
}

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
  gameState: GameState,
  canvasWidth: number,
  canvasHeight: number,
  canvasX: number,
  canvasY: number,
  activeTank?: GameState["tanks"][number],
): string | null {
  if (
    gameState.match.phase !== "aiming" &&
    gameState.match.phase !== "thinking"
  ) {
    return null;
  }

  const targetTank =
    activeTank ??
    gameState.tanks.find(
      (entry) =>
        entry.playerId === gameState.match.activePlayerId && entry.alive,
    );
  if (!targetTank) return null;

  const layout = getProjectileSelectorLayout(
    canvasWidth,
    canvasHeight,
    targetTank.loadout.length,
  );

  for (let index = 0; index < targetTank.loadout.length; index += 1) {
    const slot = targetTank.loadout[index];
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
