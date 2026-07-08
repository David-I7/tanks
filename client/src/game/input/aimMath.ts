import type { GameSnapshot, PlayerIntent } from "../types";
import type { ViewportSize } from "../world/worldSizing";
import { canvasPointToViewportPoint } from "../world/worldSizing";

export type CanvasAimInput = {
  clientX: number;
  clientY: number;
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">;
  canvasWidth?: number;
  canvasHeight?: number;
  viewport?: ViewportSize;
  cameraX: number;
  snapshot: GameSnapshot;
};

export function calculateAimIntent(input: CanvasAimInput): Extract<PlayerIntent, { type: "aim" }> | null {
  const activeTank = input.snapshot.tanks.find(
    (entry) => entry.tank.playerId === input.snapshot.match.activePlayerId && entry.tank.alive,
  );
  if (!activeTank) return null;

  const viewport =
    input.viewport ??
    {
      width: input.canvasWidth ?? input.rect.width,
      height: input.canvasHeight ?? input.rect.height,
    };
  const point = canvasPointToViewportPoint({
    clientX: input.clientX,
    clientY: input.clientY,
    rect: input.rect,
    viewport,
  });
  const worldX = point.x + input.cameraX;
  const worldY = point.y;
  const originX = activeTank.position.x;
  const originY = activeTank.position.y - 22;
  const dx = worldX - originX;
  const dy = worldY - originY;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;

  return {
    type: "aim",
    angle: Math.atan2(dy, dx),
    power: Math.max(140, Math.min(distance * 1.35, 680)),
  };
}
