import type { Method } from "axios";
import { TanksRequest } from "../TanksRequest";
import type RefreshResponseDto from "../../dto/RefreshResponseDto";

export default class RefreshRequest extends TanksRequest<RefreshResponseDto> {
  getPath(): string {
    return "/auth/refresh";
  }

  getMethod(): Method {
    return "POST";
  }
}
