import type { Method } from "axios";
import { TanksRequest } from "./TanksRequest";

export type LogoutResponse = void;

export default class LogoutRequest extends TanksRequest<LogoutResponse> {
  getPath(): string {
    return "/auth/logout";
  }
  getMethod(): Method {
    return "POST";
  }
}
