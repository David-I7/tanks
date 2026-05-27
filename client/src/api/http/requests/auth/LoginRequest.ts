import type { AxiosHeaders, Method } from "axios";
import { TanksRequest } from "../TanksRequest";
import type RefreshResponse from "../../dto/RefreshResponseDto";
import type LoginRequestDto from "../../dto/LoginRequestDto";

export default class LoginRequest extends TanksRequest<RefreshResponse> {
  constructor(private loginRequest: LoginRequestDto) {
    super();
  }

  getPath(): string {
    return "/auth/login/password";
  }

  getMethod(): Method {
    return "POST";
  }

  getHeaders(): AxiosHeaders[""] | undefined {
    return { "content-type": "application/json" };
  }

  getBody() {
    return this.loginRequest;
  }
}
