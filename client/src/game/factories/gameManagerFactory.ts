import type { GameContent } from "../content/mockGameContent";
import { mockGameContent } from "../content/mockGameContent";
import { createLocalGameManager, type GameManager } from "../authority/gameAuthority";
import { createDefaultMatchSetup } from "../world/createInitialWorld";
import { createWorldSizingPolicy } from "../world/worldSizing";
import type { GameAuthority } from "../authority/gameAuthority";
import type { GameMode, GameState, GameViewState, MatchSetup } from "../types";

export function createCanvasSizedLocalGameManager(options: {
  canvas: HTMLCanvasElement;
  mode: Exclude<GameMode, "online">;
  setup?: MatchSetup;
  content?: GameContent;
}): GameManager {
  const rect = options.canvas.getBoundingClientRect();
  const sizing = createWorldSizingPolicy({
    viewport: { width: rect.width, height: rect.height },
    devicePixelRatio: window.devicePixelRatio || 1,
  });
  const content = options.content ?? mockGameContent;

  return createLocalGameManager({
    mode: options.mode,
    setup: options.setup ?? createDefaultMatchSetup(options.mode),
    content,
    worldSize: sizing.world,
  });
}

export function adaptReadyGameAuthorityToGameManager(
  authority: GameAuthority,
): GameManager | null {
  const initialState = authority.getViewState();
  if (!initialState) return null;

  return {
    submitAction(action): boolean {
      return authority.submitAction(action);
    },
    update(dt): void {
      authority.update(dt);
    },
    getState(): GameState {
      return authority.getViewState() as GameViewState;
    },
    subscribe(listener): () => void {
      return authority.subscribe((state) => {
        listener(state);
      });
    },
    destroy(): void {
      authority.destroy();
    },
  };
}
