import type { AxiosHeaders, Method } from "axios";
import { TanksCommand } from "./TanksCommand";
import type User from "./dto/User";

export type AuthStatusResponse = {
  user: User;
};

export default class AuthStatusCommand extends TanksCommand<User> {
  getPath(): string {
    return "/auth/status";
  }

  getMethod(): Method {
    return "GET";
  }
}
