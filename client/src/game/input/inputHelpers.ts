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

  const d = worldX - originX;
  const h = originY - worldY;

  const slot = activeTank.loadout.find(
    (entry) => entry.id === activeTank.selectedProjectileSlotId,
  );
  const projectileDefinition = slot
    ? input.gameState.projectileDefinitions[slot.projectileDefinitionId]
    : null;
  const muzzleVelocityScale =
    projectileDefinition?.physics.muzzleVelocityScale ?? 1;

  let angle: number;
  let power: number;

  const GRAVITY = 520;
  if (h > 5 && Math.abs(d) > 5) {
    angle = Math.atan2(-2 * h, d);
    const v0 = Math.sqrt(GRAVITY * ((d * d) / (2 * h) + 2 * h));
    const rawPower = v0 / muzzleVelocityScale;
    power = Math.max(120, Math.min(rawPower, 680));
  } else {
    const dx = d;
    const dy = worldY - originY;
    angle = Math.atan2(dy, dx);
    const distance = Math.hypot(dx, dy);
    const rawPower = (distance * 1.5) / muzzleVelocityScale;
    power = Math.max(120, Math.min(rawPower, 680));
  }

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

export function isFireButtonClickedAtCanvasPoint(
  gameState: GameState,
  canvasWidth: number,
  canvasHeight: number,
  canvasX: number,
  canvasY: number,
  activeTank?: GameState["tanks"][number],
): boolean {
  if (gameState.match.phase !== "thinking") return false;
  const targetTank =
    activeTank ??
    gameState.tanks.find(
      (entry) =>
        entry.playerId === gameState.match.activePlayerId && entry.alive,
    );
  if (!targetTank) return false;

  const layout = getProjectileSelectorLayout(
    canvasWidth,
    canvasHeight,
    targetTank.loadout.length,
  );
  const totalWidth =
    targetTank.loadout.length * layout.slotSize +
    Math.max(0, targetTank.loadout.length - 1) * layout.gap;

  const fireX = layout.x + totalWidth + 12;
  const fireY = layout.y;
  const fireW = 76;
  const fireH = layout.slotSize;

  return (
    canvasX >= fireX - 4 &&
    canvasX <= fireX + fireW + 4 &&
    canvasY >= fireY - 4 &&
    canvasY <= fireY + fireH + 4
  );
}

export function isRelockCameraButtonClickedAtCanvasPoint(
  gameState: GameState,
  canvasWidth: number,
  _canvasHeight: number,
  canvasX: number,
  canvasY: number,
): boolean {
  if (gameState.match.isCameraLocked !== false) return false;

  const btnX = canvasWidth / 2 - 65;
  const btnY = 84;
  const btnW = 130;
  const btnH = 30;

  return (
    canvasX >= btnX &&
    canvasX <= btnX + btnW &&
    canvasY >= btnY &&
    canvasY <= btnY + btnH
  );
}
