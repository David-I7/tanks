import type { WebSocketEventResponseDto } from "../WebSocketEventResponseDto";

export type LobbyEventType =
  | "LOBBY_CONNECT"
  | "LOBBY_DISCONNECT"
  | "LOBBY_LEAVE"
  | "LOBBY_JOINED"
  | "LOBBY_CREATED";

export type LobbyEventPayload = {
  id: string;
  hostId: number;
  triggeredBy: string;
};

export type LobbyEvent = {
  type: LobbyEventType;
  payload: LobbyEventPayload;
};

export function isLobbyEvent(
  event: WebSocketEventResponseDto,
): event is LobbyEvent {
  return (
    event.type === "LOBBY_CONNECT" ||
    event.type === "LOBBY_DISCONNECT" ||
    event.type === "LOBBY_LEAVE" ||
    event.type === "LOBBY_JOINED" ||
    event.type === "LOBBY_CREATED"
  );
}
