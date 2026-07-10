import type UserDto from "./UserDto";

export default interface AuthStatusResponseDto {
    user: UserDto;
    userSessionStatus: UserSessionStatus | null;
}

export type UserSessionStatus = {
    state: "IDLE";
    lobbyId: null;
    gameId: null;
} | {
    state: "IN_LOBBY";
    lobbyId: string;
    gameId: null;
    lobbyPlayerCount?: number;
    lobbyHostId?: number;
} | {
    state: "IN_GAME";
    lobbyId: null;
    gameId: string;
}
