import type { Method } from "axios";
import { TanksRequest } from "@/api/http/requests/TanksRequest";
import type { LobbyActionResponseDto } from "../dto/LobbyActionResponseDto";

export interface JoinLobbyPayload {
  nickname: string;
  tankId: string;
}

export default class JoinLobbyRequest extends TanksRequest<LobbyActionResponseDto> {
  constructor(
    private lobbyId: string,
    private body: JoinLobbyPayload,
  ) {
    super();
  }

  getPath(): string {
    return `/api/v1/lobbies/${this.lobbyId}/join`;
  }

  getMethod(): Method {
    return "POST";
  }

  getBody(): JoinLobbyPayload {
    return this.body;
  }
}
