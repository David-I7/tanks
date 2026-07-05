export type GameEventPayload = { id: string, playerName: string };

export type GameStartedPayload = {
    id: string;
    playerA: string;
    playerB: string;
    startedAt: Date;
}

export type GameEvent = {
    sender: string;
    type: "GAME_CONNECT" | "GAME_DISCONNECT" | "GAME_CREATED";
    payload: GameEventPayload;
} | {
    sender: string;
    type: "GAME_STARTED";
    payload: GameStartedPayload;
}