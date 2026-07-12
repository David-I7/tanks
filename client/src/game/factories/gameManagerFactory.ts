import type { GameContent } from "../content/mockGameContent";
import { mockGameContent } from "../content/mockGameContent";
import { createLocalGameManager, type GameManager } from "../authority/gameManager";
import { createDefaultMatchSetup } from "../world/createInitialWorld";
import { createCanvasSizing, readDomCanvasRect } from "../world/worldSizing";
import type { GameMode, MatchSetup } from "../types";

export function createCanvasSizedLocalGameManager(options: {
  canvas: HTMLCanvasElement;
  mode: Exclude<GameMode, "online">;
  setup?: MatchSetup;
  content?: GameContent;
}): GameManager {
  const sizing = createCanvasSizing({
    domCanvasRect: readDomCanvasRect(options.canvas),
    devicePixelRatio: window.devicePixelRatio || 1,
  });
  const content = options.content ?? mockGameContent;

  return createLocalGameManager({
    mode: options.mode,
    setup: options.setup ?? createDefaultMatchSetup(options.mode),
    content,
    initialGameViewport: sizing.gameViewport,
  });
}
