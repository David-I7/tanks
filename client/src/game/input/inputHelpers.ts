import type {
  GameAction,
  GameState,
} from "../types";
import type { DomCanvasRect, GameViewport } from "../world/worldSizing";
import { domPointToGameViewportPoint } from "../world/worldSizing";
import { clampAimAngle, TURRET_Y_OFFSET } from "../simulation/ballistics";

export const DEFAULT_MIN_AIM_POWER = 120;
export const DEFAULT_MAX_AIM_POWER = 680;

export type CanvasAimInput = {
  clientX: number;
  clientY: number;
  domCanvasRect: DomCanvasRect;
  gameViewport: GameViewport;
  cameraX: number;
  gameState: GameState;
  activeTank: GameState["tanks"][number];
};

export function calculateAimIntent(
  input: CanvasAimInput,
): Extract<GameAction, { type: "aim" }> | null {
  const activeTank = input.activeTank;
  if (!activeTank || activeTank.controllerKind === "remote" || !activeTank.alive) return null;

  const point = domPointToGameViewportPoint({
    clientX: input.clientX,
    clientY: input.clientY,
    domCanvasRect: input.domCanvasRect,
    gameViewport: input.gameViewport,
  });
  const worldX = point.x + input.cameraX;
  const worldY = point.y;

  const bodyAngle = activeTank.bodyAngle ?? 0;
  const originX = activeTank.position.x - TURRET_Y_OFFSET * Math.sin(bodyAngle);
  const originY = activeTank.position.y + TURRET_Y_OFFSET * Math.cos(bodyAngle);

  const dx = worldX - originX;
  const dy = worldY - originY;
  const worldPointerAngle = Math.atan2(dy, dx);
  const distance = Math.hypot(dx, dy);

  let relativeAngle = worldPointerAngle - bodyAngle;
  while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
  while (relativeAngle <= -Math.PI) relativeAngle += 2 * Math.PI;

  const power = Math.max(
    DEFAULT_MIN_AIM_POWER,
    Math.min(Math.round(distance * 1.8), DEFAULT_MAX_AIM_POWER),
  );

  return {
    type: "aim",
    angle: clampAimAngle(relativeAngle),
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
  activeTank: GameState["tanks"][number],
): string | null {
  if (gameState.match.phase !== "thinking") {
    return null;
  }

  if (!activeTank || activeTank.controllerKind === "remote" || !activeTank.alive) return null;

  const layout = getProjectileSelectorLayout(
    canvasWidth,
    canvasHeight,
    activeTank.loadout.length,
  );

  for (let index = 0; index < activeTank.loadout.length; index += 1) {
    const slotId = activeTank.loadout[index];
    if (!slotId) continue;
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
      return slotId;
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
  activeTank: GameState["tanks"][number],
): boolean {
  if (gameState.match.phase !== "thinking") return false;
  if (!activeTank || activeTank.controllerKind === "remote" || !activeTank.alive) return false;

  const layout = getProjectileSelectorLayout(
    canvasWidth,
    canvasHeight,
    activeTank.loadout.length,
  );
  const totalWidth =
    activeTank.loadout.length * layout.slotSize +
    Math.max(0, activeTank.loadout.length - 1) * layout.gap;

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
