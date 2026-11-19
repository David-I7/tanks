import type { ChatEvent } from "@/api/ws/dto/chat/ChatEventDto";
import type { LobbyEvent } from "@/api/ws/dto/lobby/LobbyEventDto";
import type { ChatMessage } from "./chatReducer";

export type MappedChatEvent =
  | { kind: "ignore" }
  | { kind: "typing"; username: string }
  | { kind: "message"; message: ChatMessage; clearTyping: boolean };

export function mapTopicEventToChat(
  event: LobbyEvent | ChatEvent,
  username: string,
  myPlayerId?: string,
): MappedChatEvent {
  switch (event.type) {
    case "CHAT_TYPE": {
      if (event.payload.triggeredBy === username) {
        return { kind: "ignore" };
      }
      return {
        kind: "typing",
        username: event.payload.triggeredBy,
      };
    }

    case "CHAT_MESSAGE": {
      const sender = event.payload.triggeredBy;
      return {
        kind: "message",
        message: {
          type: "MESSAGE",
          sender,
          payload: event.payload.message,
        },
        clearTyping: sender !== username,
      };
    }

    case "LOBBY_CONNECT": {
      const sender = event.payload.triggeredBy;
      const isMe = myPlayerId !== undefined && sender === myPlayerId;
      return {
        kind: "message",
        message: {
          type: "CONNECT",
          sender,
          payload: isMe ? "You've connected" : "Opponent connected",
        },
        clearTyping: false,
      };
    }

    case "LOBBY_LEAVE": {
      const sender = event.payload.triggeredBy;
      const isMe = myPlayerId !== undefined && sender === myPlayerId;
      return {
        kind: "message",
        message: {
          type: "LEAVE",
          sender,
          payload: isMe ? "You've left" : "Opponent left",
        },
        clearTyping: !isMe,
      };
    }

    case "LOBBY_DISCONNECT": {
      const sender = event.payload.triggeredBy;
      const isMe = myPlayerId !== undefined && sender === myPlayerId;
      return {
        kind: "message",
        message: {
          type: "DISCONNECT",
          sender,
          payload: isMe ? "You've disconnected" : "Opponent disconnected",
        },
        clearTyping: !isMe,
      };
    }

    default:
      return { kind: "ignore" };
  }
}
