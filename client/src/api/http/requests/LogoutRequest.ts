import type { Method } from "axios";
import { TanksRequest } from "./TanksRequest";

export default class LogoutRequest extends TanksRequest<void> {
  getPath(): string {
    return "/auth/logout";
  }
  getMethod(): Method {
    return "POST";
  }
}
