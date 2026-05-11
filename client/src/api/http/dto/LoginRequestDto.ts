import type User from "./User";

export default interface LoginResponse {
  user: User;
  accessToken: string;
}
