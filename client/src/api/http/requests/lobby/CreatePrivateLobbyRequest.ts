import type { Method } from "axios";
import type LobbyResponseDto from "../../dto/lobby/LobbyResponseDto";
import { TanksRequest } from "../TanksRequest";

export default class CreatePrivateLobbyRequest extends TanksRequest<LobbyResponseDto> {
  getPath(): string {
    return "/lobby";
  }

  getMethod(): Method {
    return "POST";
  }
}
