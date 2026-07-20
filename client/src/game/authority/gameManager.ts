import type { GameAction, GameState } from "../types";

export interface GameManager {
  submitAction(action: GameAction): boolean;
  update(dt: number): void;
  getState(): GameState;
  subscribe(listener: (state: GameState) => void): () => void;
  destroy(): void;
}
