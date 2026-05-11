import type { Method } from "axios";
import { TanksRequest } from "./TanksRequest";
import type LoginResponse from "./dto/LoginRequestDto";

export default class GoogleLoginRequest extends TanksRequest<LoginResponse> {
  public getPath(): string {
    return "/auth/login/oauth2/callback/google";
  }

  public getMethod(): Method {
    return "GET";
  }
}
