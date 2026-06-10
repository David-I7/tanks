import type { ChatEventPayload, ChatEventType } from "./chat/ChatEventDto";
import type { GameEventPayload, GameEventType } from "./game/GameEventDto";
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
    }
  | {
      type: GameEventType;
      sender: string;
      payload: GameEventPayload;
    };
