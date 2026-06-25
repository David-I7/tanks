import type { Method } from "axios";
import { TanksRequest } from "../TanksRequest";
import type AuthStatusResponseDto from "../../dto/AuthStatusResponseDto";

export default class AuthStatusRequest extends TanksRequest<AuthStatusResponseDto> {
  getPath(): string {
    return "/auth/status";
  }

  getMethod(): Method {
    return "POST";
  }
}
