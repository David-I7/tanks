import type { Method } from "axios";
import { TanksRequest } from "./TanksRequest";
import type RefreshResponseDto from "../dto/RefreshResponseDto";
import type RegisterRequestDto from "../dto/RegisterRequestDto";

export default class RegisterRequest extends TanksRequest<RefreshResponseDto> {
  constructor(private requestBody: RegisterRequestDto) {
    super();
  }

  getPath(): string {
    return "/auth/register";
  }

  getMethod(): Method {
    return "POST";
  }

  getBody() {
    return this.requestBody;
  }
}
