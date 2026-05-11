import type { AxiosHeaders, Method } from "axios";
import { TanksRequest } from "./TanksRequest";
import type LoginResponse from "./dto/LoginRequestDto";

export interface LoginRequestDto {
  username?: string;
  password: string;
  email?: string;
}

export default class LoginRequest extends TanksRequest<LoginResponse> {
  constructor(private loginRequest: LoginRequestDto) {
    super();
  }

  getPath(): string {
    return "/auth/login";
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
