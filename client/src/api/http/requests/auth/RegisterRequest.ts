import type { AxiosHeaders, Method } from "axios";
import { TanksRequest } from "../TanksRequest";
import type RefreshResponseDto from "../../dto/RefreshResponseDto";
import type RegisterRequestDto from "../../dto/RegisterRequestDto";

export default class RegisterRequest extends TanksRequest<RefreshResponseDto> {
  constructor(private requestBody: RegisterRequestDto) {
    super();
  }

  getPath(): string {
    return "/auth/register/password";
  }

  getMethod(): Method {
    return "POST";
  }

  getHeaders(): AxiosHeaders[""] | undefined {
    return { "content-type": "application/json" };
  }

  getBody() {
    return this.requestBody;
  }
}
