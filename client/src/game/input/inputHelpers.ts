import type { GameAction, GameState } from "../types";
import type { DomCanvasRect, GameViewport } from "../world/worldSizing";
import { domPointToGameViewportPoint } from "../world/worldSizing";

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
        entry.playerId === input.gameState.match.activePlayerId && entry.alive,
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

  const dx = worldX - originX;
  const dy = worldY - originY;

  const angle = Math.atan2(dy, dx);
  const distance = Math.hypot(dx, dy);

  const slot = activeTank.loadout.find(
    (entry) => entry.id === activeTank.selectedProjectileSlotId,
  );
  const projectileDefinition = slot
    ? input.gameState.projectileDefinitions[slot.projectileDefinitionId]
    : null;
  const muzzleVelocityScale =
    projectileDefinition?.physics.muzzleVelocityScale ?? 1;

  const rawPower = (distance * 1.5) / muzzleVelocityScale;
  const power = Math.max(120, Math.min(rawPower, 680));

  return {
    type: "aim",
    angle,
    power,
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
  if (gameState.match.phase !== "thinking") {
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
    const slotY = layout.y;

    const minX = slotX - 10;
    const maxX = slotX + layout.slotSize + 10;
    const minY = slotY - 20;
    const maxY = canvasHeight;

    if (
      canvasX >= minX &&
      canvasX <= maxX &&
      canvasY >= minY &&
      canvasY <= maxY
    ) {
      return slot.id;
    }
  }

  return null;
}
