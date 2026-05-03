import type { Method } from "axios";
import { TanksCommand } from "./TanksCommand";

export type LogoutResponse = void;

export default class LogoutCommand extends TanksCommand<LogoutResponse> {
  getPath(): string {
    return "/auth/logout";
  }
  getMethod(): Method {
    return "POST";
  }
}
