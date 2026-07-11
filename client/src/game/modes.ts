import type { GameMode, ControllerKind } from "./types";

export type LocalControllerKind = "human" | "ai";

export function getLocalControllerKind(mode: GameMode, activePlayerId: number): LocalControllerKind {
  if (mode === "playerVsAi") {
    return activePlayerId === 0 ? "human" : "ai";
  }

  return "human";
}

export function getPlayerMatchConfig(mode: GameMode, playerId: number): {
  displayName: string;
  controllerKind: ControllerKind;
} {
  if (mode === "playerVsAi") {
    return {
      displayName: playerId === 0 ? "Player 1" : "CPU",
      controllerKind: playerId === 0 ? "human" : "ai",
    };
  }
  if (mode === "online") {
    return {
      displayName: playerId === 0 ? "Player 1" : "Player 2",
      controllerKind: playerId === 0 ? "human" : "remote",
    };
  }
  return {
    displayName: playerId === 0 ? "Player 1" : "Player 2",
    controllerKind: "human",
  };
}
