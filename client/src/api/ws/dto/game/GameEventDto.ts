export type GameEventType = "GAME_CREATED" | "GAME_STARTED" | "GAME_CONNECT" | "GAME_DISCONNECT";

export type GameEventPayload = { id: string, playerName: string };
