import type { AxiosHeaders, Method } from "axios";
import { TanksRequest } from "./TanksRequest";
import type User from "./dto/User";

export type AuthStatusResponse = {
  user: User;
};

export default class AuthStatusRequest extends TanksRequest<User> {
  getPath(): string {
    return "/auth/status";
  }

  getMethod(): Method {
    return "GET";
  }
}
