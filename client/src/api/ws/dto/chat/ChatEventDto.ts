import type { WebSocketEventResponseDto } from "../WebSocketEventResponseDto";

export type ChatEventType = "CHAT_MESSAGE" | "CHAT_TYPE";

export type ChatEvent =
  | {
      type: "CHAT_MESSAGE";
      payload: { message: string; triggeredBy: string };
    }
  | {
      type: "CHAT_TYPE";
      payload: { triggeredBy: string };
    };

export function isChatEvent(
  event: WebSocketEventResponseDto,
): event is ChatEvent {
  return event.type === "CHAT_MESSAGE" || event.type === "CHAT_TYPE";
}
