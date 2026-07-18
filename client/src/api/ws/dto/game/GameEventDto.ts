import type { PlayerId } from "../gameplay/OnlineGameplayProtocol";
import type { WebSocketEventResponseDto } from "../WebSocketEventResponseDto";

export type GameEventPayload = {
  id: string;
  hostId: number;
  triggeredBy: string;
};

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
      type: "GAME_CONNECT" | "GAME_LEAVE" | "GAME_CREATED";
      payload: GameEventPayload;
    }
  | {
      type: "GAME_STARTED";
      payload: GameStartedPayload;
    };

export function isGameEvent(
  event: WebSocketEventResponseDto,
): event is GameEvent {
  return (
    event.type === "GAME_CONNECT" ||
    event.type === "GAME_LEAVE" ||
    event.type === "GAME_CREATED" ||
    event.type === "GAME_STARTED"
  );
}
