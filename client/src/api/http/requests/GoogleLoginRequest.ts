import type { Method } from "axios";
import { TanksRequest } from "../requests/TanksRequest";
import type RefreshResponseDto from "../dto/RefreshResponseDto";

export default class GoogleLoginRequest extends TanksRequest<RefreshResponseDto> {
  public getPath(): string {
    return "/auth/login/oauth2/callback/google";
  }

  public getMethod(): Method {
    return "GET";
  }
}
