import type { ChatEventPayload, ChatEventType } from "./chat/ChatEventDto";
import type { LobbyEventPayload, LobbyEventType } from "./lobby/LobbyEventDto";

export type WebSocketEventResponseDto =
  | {
      type: ChatEventType;
      sender: string;
      payload: ChatEventPayload;
    }
  | {
      type: LobbyEventType;
      sender: string;
      payload: LobbyEventPayload;
    };
