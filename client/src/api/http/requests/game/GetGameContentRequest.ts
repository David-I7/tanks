import type { Method } from "axios";
import { TanksRequest } from "../TanksRequest";
import type { GameContentResponseDto } from "../../../ws/dto/gameplay/onlineGameplayProtocol";

export class GetGameContentRequest extends TanksRequest<GameContentResponseDto> {
  getPath(): string {
    return "/game/content";
  }

  getMethod(): Method {
    return "GET";
  }
}
