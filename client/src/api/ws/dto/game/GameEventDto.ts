export type GameEventPayload = { id: string, playerName: string };

export type GameStartedPayload = {
    gameSessionId: string;
    playerA: string;
    playerB: string;
    gameStartedAt: string;
    gameplayDefinitionVersion: string;
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
