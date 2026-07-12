import type { GameAction, GameViewState } from "../types";
import type { DomCanvasRect, GameViewport } from "../world/worldSizing";
import { domPointToGameViewportPoint } from "../world/worldSizing";

export type CanvasAimInput = {
  clientX: number;
  clientY: number;
  domCanvasRect: DomCanvasRect;
  gameViewport: GameViewport;
  cameraX: number;
  gameViewState: GameViewState;
};

export function calculateAimIntent(
  input: CanvasAimInput,
): Extract<GameAction, { type: "aim" }> | null {
  const activeTank = input.gameViewState.tanks.find(
    (entry) =>
      entry.playerId === input.gameViewState.match.activePlayerId &&
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
  const dx = worldX - originX;
  const dy = worldY - originY;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;

  return {
    type: "aim",
    angle: Math.atan2(dy, dx),
    power: Math.max(140, Math.min(distance * 1.35, 680)),
  };
}
