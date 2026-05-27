import type { Method } from "axios";
import type LobbyResponseDto from "../../dto/lobby/LobbyResponseDto";
import { TanksRequest } from "../TanksRequest";

export default class JoinPrivateLobbyRequest extends TanksRequest<LobbyResponseDto> {
  constructor(private id: string) {
    super();
  }

  getPath(): string {
    return `/lobby/${this.id}`;
  }

  getMethod(): Method {
    return "POST";
  }
}
