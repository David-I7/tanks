import type { Method } from "axios";
import type User from "./dto/User";
import { TanksRequest } from "./TanksRequest";

type RefreshResponse = {
  accessToken: string;
  user: User;
};

export default class RefreshRequest extends TanksRequest<RefreshResponse> {
  getPath(): string {
    return "/auth/refresh";
  }

  getMethod(): Method {
    return "POST";
  }
}
