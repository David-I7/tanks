import type { AxiosHeaders, Method } from "axios";
import type RefreshResponseDto from "../dto/RefreshResponseDto";
import { TanksRequest } from "./TanksRequest";
import type PostOauth2LoginRequestDto from "../dto/PostOauth2LoginRequestDto";

export default class PostOauth2LoginRequest extends TanksRequest<RefreshResponseDto> {
  constructor(private body: PostOauth2LoginRequestDto) {
    super();
  }

  getBody(): any {
    return this.body;
  }

  getPath(): string {
    return "/auth/login/postOAuth2";
  }

  getMethod(): Method {
    return "POST";
  }

  getHeaders(): AxiosHeaders[""] | undefined {
    return { "content-type": "application/json" };
  }
}
