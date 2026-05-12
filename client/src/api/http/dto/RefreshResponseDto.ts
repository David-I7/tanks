import type UserDto from "./UserDto";

export default interface RefreshResponseDto {
  user: UserDto;
  accessToken: string;
}
