import type { Method } from "axios";
import { TanksRequest } from "@/api/http/requests/TanksRequest";
import type { LobbyActionResponseDto } from "../dto/LobbyActionResponseDto";

export interface QuickMatchPayload {
  nickname: string;
  tankId: string;
}

export default class QuickMatchRequest extends TanksRequest<LobbyActionResponseDto> {
  constructor(private body: QuickMatchPayload) {
    super();
  }

  getPath(): string {
    return "/api/v1/lobbies/quick-match";
  }

  getMethod(): Method {
    return "POST";
  }

  getBody(): QuickMatchPayload {
    return this.body;
  }
}
