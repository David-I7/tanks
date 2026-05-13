import type { Method } from "axios";
import { TanksRequest } from "../requests/TanksRequest";
import type RefreshResponseDto from "../dto/RefreshResponseDto";

export default class GoogleLoginRequest extends TanksRequest<RefreshResponseDto> {
  public getPath(): string {
    return "/auth/oauth2/authorization/google";
  }

  public getMethod(): Method {
    return "GET";
  }
}
