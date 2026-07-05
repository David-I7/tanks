import type { GameSnapshot, PlayerIntent } from "../types";

export type CanvasAimInput = {
  clientX: number;
  clientY: number;
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">;
  canvasWidth: number;
  canvasHeight: number;
  cameraX: number;
  snapshot: GameSnapshot;
};

export function calculateAimIntent(input: CanvasAimInput): Extract<PlayerIntent, { type: "aim" }> | null {
  const activeTank = input.snapshot.tanks.find(
    (entry) => entry.tank.playerId === input.snapshot.match.activePlayerId && entry.tank.alive,
  );
  if (!activeTank) return null;

  const scaleX = input.canvasWidth / input.rect.width;
  const scaleY = input.canvasHeight / input.rect.height;
  const worldX = (input.clientX - input.rect.left) * scaleX + input.cameraX;
  const worldY = (input.clientY - input.rect.top) * scaleY;
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
