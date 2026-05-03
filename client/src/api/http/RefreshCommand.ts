import type { Method } from "axios";
import type User from "./dto/User";
import { TanksCommand } from "./TanksCommand";

type RefreshResponse = {
  accessToken: string;
  user: User;
};

export default class RefreshCommand extends TanksCommand<RefreshResponse> {
  getPath(): string {
    return "/auth/refresh";
  }

  getMethod(): Method {
    return "POST";
  }
}
