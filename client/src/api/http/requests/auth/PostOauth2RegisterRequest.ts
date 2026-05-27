import type { AxiosHeaders, Method } from "axios";
import type PostOauth2RegisterRequestDto from "../../dto/PostOauth2RegisterRequestDto";
import { TanksRequest } from "../TanksRequest";
import type RefreshResponseDto from "../../dto/RefreshResponseDto";

export default class PostOauth2RegisterRequest extends TanksRequest<RefreshResponseDto> {
  constructor(private body: PostOauth2RegisterRequestDto) {
    super();
  }

  getBody(): any {
    return this.body;
  }

  getPath(): string {
    return "/auth/register/postOAuth2";
  }

  getMethod(): Method {
    return "POST";
  }

  getHeaders(): AxiosHeaders[""] | undefined {
    return { "content-type": "application/json" };
  }
}
