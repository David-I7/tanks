import type { Method } from "axios";
import { TanksRequest } from "@/api/http/requests/TanksRequest";
import type { LobbyActionResponseDto } from "../dto/LobbyActionResponseDto";

export interface CreateLobbyPayload {
  nickname: string;
  tankId: string;
}

export default class CreateLobbyRequest extends TanksRequest<LobbyActionResponseDto> {
  constructor(private body: CreateLobbyPayload) {
    super();
  }

  getPath(): string {
    return "/api/v1/lobbies";
  }

  getMethod(): Method {
    return "POST";
  }

  getBody(): CreateLobbyPayload {
    return this.body;
  }
}
