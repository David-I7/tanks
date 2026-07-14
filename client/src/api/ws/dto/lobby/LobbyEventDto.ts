export type LobbyEventType =
  | "LOBBY_CONNECT"
  | "LOBBY_DISCONNECT"
  | "LOBBY_LEAVE"
  | "LOBBY_JOINED"
  | "LOBBY_CREATED";

export type LobbyEventPayload = { id: string; playerName: string };

export type LobbyEvent = {
  sender: string;
  type: LobbyEventType;
  payload: LobbyEventPayload;
};
