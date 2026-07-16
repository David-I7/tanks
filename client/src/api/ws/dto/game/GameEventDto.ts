import type { PlayerId } from "../gameplay/OnlineGameplayProtocol";

export type GameEventPayload = { id: string; playerName: string };

export type GameStartedPayload = {
  gameSessionId: string;
  playerA: string;
  playerB: string;
  gameStartedAt: string;
  gameContentVersion: string;
  localPlayerId: PlayerId;
};

export type GameEvent =
  | {
      sender: string;
      type: "GAME_CONNECT" | "GAME_LEAVE" | "GAME_CREATED";
      payload: GameEventPayload;
    }
  | {
      sender: string;
      type: "GAME_STARTED";
      payload: GameStartedPayload;
    };
