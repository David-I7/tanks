import type UserDto from "./UserDto";

export default interface AuthStatusResponseDto {
  user: UserDto;
  userSessionStatus: UserSessionStatus;
}

export type UserSessionStatus =
  | {
      state: "IDLE";
    }
  | {
      state: "IN_LOBBY";
      lobbyId: string;
    }
  | {
      state: "IN_GAME";
      gameId: string;
    };
