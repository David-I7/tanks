import type { Method } from "axios";
import type UserDto from "../dto/UserDto";
import { TanksRequest } from "./TanksRequest";

export default class AuthStatusRequest extends TanksRequest<UserDto> {
  getPath(): string {
    return "/auth/status";
  }

  getMethod(): Method {
    return "POST";
  }
}
