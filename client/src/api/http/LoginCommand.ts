import type { AxiosHeaders, Method } from "axios";
import type { User } from "../../state/auth";
import { TanksCommand } from "./TanksCommand";
import type { LoginRequest } from "./dto/LoginRequest";

export type LoginResponse = {
  user: User;
  accessToken: string;
};

export default class LoginCommand extends TanksCommand<LoginResponse> {
  constructor(private loginRequest: LoginRequest) {
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
