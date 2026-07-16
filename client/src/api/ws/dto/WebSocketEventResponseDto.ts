import type { ChatEvent } from "./chat/ChatEventDto";
import type { GameEvent } from "./game/GameEventDto";
import type { LobbyEvent } from "./lobby/LobbyEventDto";

export type WebSocketEventResponseDto = ChatEvent | LobbyEvent | GameEvent;
