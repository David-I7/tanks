export type LobbyEventType =
  | "LOBBY_CONNECT"
  | "LOBBY_DISCONNECT"
  | "LOBBY_JOINED"
  | "LOBBY_CREATED";

export type LobbyEventPayload = { id: string, playerName: string };
