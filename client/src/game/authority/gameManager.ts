import type { GameAction, GameState } from "../types";

export interface GameManager {
  submitAction(action: GameAction): boolean;
  update(dt: number): void;
  getState(): GameState;
  /** Returns true once the manager has received its initial state snapshot. */
  isReady?(): boolean;
  subscribe(listener: (state: GameState) => void): () => void;
  destroy(): void;
}
