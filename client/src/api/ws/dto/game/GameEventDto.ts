import type { WebSocketEventResponseDto } from "../WebSocketEventResponseDto";

export type GameEventPayload = {
  id: string;
  hostId: number;
  triggeredBy: string;
};

export type GameEvent = {
  type: "GAME_CONNECT" | "GAME_LEAVE" | "GAME_CREATED" | "GAME_DISCONNECT";
  payload: GameEventPayload;
};

export function isGameEvent(
  event: WebSocketEventResponseDto,
): event is GameEvent {
  return (
    event.type === "GAME_CONNECT" ||
    event.type === "GAME_LEAVE" ||
    event.type === "GAME_CREATED" ||
    event.type === "GAME_DISCONNECT"
  );
}
