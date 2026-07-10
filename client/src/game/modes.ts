import type { GameMode } from "./types";

export type LocalControllerKind = "human" | "ai";

export function getLocalControllerKind(mode: GameMode, activePlayerId: number): LocalControllerKind {
  if (mode === "playerVsAi") {
    return activePlayerId === 0 ? "human" : "ai";
  }

  return "human";
}
