export type OAuth2OAuth2LoginResponseType =
  | "OAUTH2_SUCCESS"
  | "OAUTH2_ERROR"
  | "OAUTH2_PARTIAL";

export default interface OAuth2LoginResponseDto {
  type: OAuth2OAuth2LoginResponseType;
  token: string | null;
}
