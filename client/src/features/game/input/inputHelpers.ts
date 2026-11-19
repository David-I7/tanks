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
  const isMobile = canvasWidth < 768;
  const slotSize = isMobile ? 52 : Math.max(48, Math.min(60, Math.floor(canvasWidth * 0.045)));
  const gap = 8;
  const totalWidth = slotCount * slotSize + Math.max(0, slotCount - 1) * gap;
  return {
    x: Math.floor((canvasWidth - totalWidth) / 2),
    y: Math.floor(canvasHeight - slotSize - 20),
    slotSize,
    gap,
  };
}

export type CompactWeaponSelectorLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  isMobile: boolean;
};

export function getCompactWeaponSelectorLayout(
  canvasWidth: number,
  canvasHeight: number,
): CompactWeaponSelectorLayout {
  const isMobile = canvasWidth < 768;
  const width = isMobile ? 124 : 152;
  const height = isMobile ? 52 : 56;
  const size = height;
  const fireWidth = isMobile ? 82 : 92;
  const gap = isMobile ? 10 : 12;
  const totalWidth = width + gap + fireWidth;

  const x = isMobile
    ? Math.floor(canvasWidth - totalWidth - 16)
    : Math.floor((canvasWidth - totalWidth) / 2);
  const y = Math.floor(canvasHeight - height - (isMobile ? 16 : 20));

  return {
    x,
    y,
    width,
    height,
    size,
    isMobile,
  };
}

export type FireButtonLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  isMobile: boolean;
};

export function getFireButtonLayout(
  canvasWidth: number,
  canvasHeight: number,
): FireButtonLayout {
  const compactLayout = getCompactWeaponSelectorLayout(canvasWidth, canvasHeight);
  const isMobile = compactLayout.isMobile;
  const width = isMobile ? 82 : 92;
  const height = compactLayout.height;
  const gap = isMobile ? 10 : 12;
  const x = compactLayout.x + compactLayout.width + gap;
  const y = compactLayout.y;

  return {
    x,
    y,
    width,
    height,
    isMobile,
  };
}

export type ExpandedWeaponDrawerLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  itemHeight: number;
  itemGap: number;
  padding: number;
  items: Array<{ slotIndex: number; x: number; y: number; width: number; height: number }>;
};

export function getExpandedWeaponDrawerLayout(
  canvasWidth: number,
  canvasHeight: number,
  slotCount: number,
): ExpandedWeaponDrawerLayout {
  const compactLayout = getCompactWeaponSelectorLayout(canvasWidth, canvasHeight);
  const isMobile = compactLayout.isMobile;
  const width = isMobile ? 228 : 260;
  const itemHeight = 44;
  const itemGap = 6;
  const padding = 8;
  const height = padding * 2 + slotCount * itemHeight + Math.max(0, slotCount - 1) * itemGap;

  let x = compactLayout.x + Math.floor((compactLayout.width - width) / 2);
  x = Math.max(8, Math.min(canvasWidth - width - 8, x));
  const y = compactLayout.y - height - 10;

  const items: ExpandedWeaponDrawerLayout["items"] = [];
  for (let i = 0; i < slotCount; i += 1) {
    items.push({
      slotIndex: i,
      x: x + padding,
      y: y + padding + i * (itemHeight + itemGap),
      width: width - padding * 2,
      height: itemHeight,
    });
  }

  return {
    x,
    y,
    width,
    height,
    itemHeight,
    itemGap,
    padding,
    items,
  };
}

export type DualHeaderHealthLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  p1: { x: number; y: number; width: number; height: number };
  vs: { x: number; y: number; width: number; height: number };
  p2: { x: number; y: number; width: number; height: number };
};

export function getDualHeaderHealthLayout(
  canvasWidth: number,
): DualHeaderHealthLayout {
  const totalWidth = Math.min(680, Math.max(280, Math.floor(canvasWidth * 0.9)));
  const height = 36;
  const y = 12;
  const vsWidth = 44;
  const barWidth = Math.floor((totalWidth - vsWidth - 16) / 2);
  const startX = Math.floor((canvasWidth - totalWidth) / 2);

  const p1 = {
    x: startX,
    y,
    width: barWidth,
    height,
  };

  const vs = {
    x: Math.floor((canvasWidth - vsWidth) / 2),
    y: y + 2,
    width: vsWidth,
    height: 32,
  };

  const p2 = {
    x: vs.x + vsWidth + 8,
    y,
    width: barWidth,
    height,
  };

  return {
    x: startX,
    y,
    width: totalWidth,
    height,
    p1,
    vs,
    p2,
  };
}

export type CentralTelemetryLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getCentralTelemetryLayout(
  canvasWidth: number,
): CentralTelemetryLayout {
  const width = Math.min(340, Math.max(260, Math.floor(canvasWidth * 0.72)));
  const height = 28;
  const x = Math.floor((canvasWidth - width) / 2);
  const y = 52;
  return { x, y, width, height };
}

export type FuelGaugeLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  isMobile: boolean;
};

export function getFuelGaugeLayout(
  canvasWidth: number,
  canvasHeight: number,
): FuelGaugeLayout {
  const isMobile = canvasWidth < 768;
  return {
    x: isMobile ? 18 : 24,
    y: isMobile ? canvasHeight - 150 : canvasHeight - 56,
    width: isMobile ? 120 : 144,
    height: isMobile ? 32 : 36,
    isMobile,
  };
}

export type VirtualTouchControlsLayout = {
  isMobile: boolean;
  dpad: {
    centerX: number;
    centerY: number;
    radius: number;
    left: { x: number; y: number; width: number; height: number };
    right: { x: number; y: number; width: number; height: number };
  };
};

export function getVirtualTouchControlsLayout(
  canvasWidth: number,
  canvasHeight: number,
): VirtualTouchControlsLayout {
  const isMobile = canvasWidth < 768;
  const dpadCenterY = canvasHeight - 68;
  const dpadCenterX = 72;
  const dpadRadius = 48;

  return {
    isMobile,
    dpad: {
      centerX: dpadCenterX,
      centerY: dpadCenterY,
      radius: dpadRadius,
      left: {
        x: dpadCenterX - dpadRadius,
        y: dpadCenterY - dpadRadius,
        width: dpadRadius,
        height: dpadRadius * 2,
      },
      right: {
        x: dpadCenterX,
        y: dpadCenterY - dpadRadius,
        width: dpadRadius,
        height: dpadRadius * 2,
      },
    },
  };
}

export function isCompactWeaponSlotClickedAtCanvasPoint(
  gameState: GameState,
  canvasWidth: number,
  canvasHeight: number,
  canvasX: number,
  canvasY: number,
  activeTank: GameState["tanks"][number],
): boolean {
  if (gameState.match.phase !== "thinking") return false;
  if (!activeTank || activeTank.controllerKind === "remote" || !activeTank.alive) return false;

  const layout = getCompactWeaponSelectorLayout(canvasWidth, canvasHeight);
  return (
    canvasX >= layout.x - 6 &&
    canvasX <= layout.x + layout.width + 6 &&
    canvasY >= layout.y - 6 &&
    canvasY <= layout.y + layout.height + 6
  );
}

export function findExpandedDrawerSlotAtCanvasPoint(
  gameState: GameState,
  canvasWidth: number,
  canvasHeight: number,
  canvasX: number,
  canvasY: number,
  activeTank: GameState["tanks"][number],
  isDrawerOpen: boolean,
): string | null {
  if (!isDrawerOpen || gameState.match.phase !== "thinking") return null;
  if (!activeTank || activeTank.controllerKind === "remote" || !activeTank.alive) return null;

  const drawerLayout = getExpandedWeaponDrawerLayout(
    canvasWidth,
    canvasHeight,
    activeTank.loadout.length,
  );

  for (const item of drawerLayout.items) {
    if (
      canvasX >= item.x &&
      canvasX <= item.x + item.width &&
      canvasY >= item.y &&
      canvasY <= item.y + item.height
    ) {
      return activeTank.loadout[item.slotIndex] ?? null;
    }
  }

  return null;
}

export function findProjectileSlotAtCanvasPoint(
  gameState: GameState,
  canvasWidth: number,
  canvasHeight: number,
  canvasX: number,
  canvasY: number,
  activeTank: GameState["tanks"][number],
  isDrawerOpen = false,
): string | null {
  if (gameState.match.phase !== "thinking") {
    return null;
  }

  if (!activeTank || activeTank.controllerKind === "remote" || !activeTank.alive) return null;

  // 1. Check expanded drawer if open
  if (isDrawerOpen) {
    const drawerSlot = findExpandedDrawerSlotAtCanvasPoint(
      gameState,
      canvasWidth,
      canvasHeight,
      canvasX,
      canvasY,
      activeTank,
      isDrawerOpen,
    );
    if (drawerSlot) return drawerSlot;
  }

  // 2. Check compact active weapon card
  if (
    isCompactWeaponSlotClickedAtCanvasPoint(
      gameState,
      canvasWidth,
      canvasHeight,
      canvasX,
      canvasY,
      activeTank,
    )
  ) {
    return activeTank.selectedProjectileSlotId || activeTank.loadout[0] || null;
  }

  // 3. Fallback support for legacy horizontal row hit testing
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

  // 1. Check new compact Fire button layout
  const fireLayout = getFireButtonLayout(canvasWidth, canvasHeight);
  if (
    canvasX >= fireLayout.x - 6 &&
    canvasX <= fireLayout.x + fireLayout.width + 6 &&
    canvasY >= fireLayout.y - 6 &&
    canvasY <= fireLayout.y + fireLayout.height + 6
  ) {
    return true;
  }

  // 2. Fallback support for legacy horizontal bar layout
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
  const btnY = 88;
  const btnW = 130;
  const btnH = 30;

  return (
    canvasX >= btnX &&
    canvasX <= btnX + btnW &&
    canvasY >= btnY &&
    canvasY <= btnY + btnH
  );
}

export function getVirtualMovementIntentAtCanvasPoint(
  canvasWidth: number,
  canvasHeight: number,
  canvasX: number,
  canvasY: number,
): -1 | 1 | null {
  const touchLayout = getVirtualTouchControlsLayout(canvasWidth, canvasHeight);
  const dpad = touchLayout.dpad;
  const dx = canvasX - dpad.centerX;
  const dy = canvasY - dpad.centerY;
  const dist = Math.hypot(dx, dy);

  if (dist <= dpad.radius + 16) {
    return dx < 0 ? -1 : 1;
  }
  return null;
}


