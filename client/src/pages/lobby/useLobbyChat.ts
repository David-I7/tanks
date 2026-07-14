import { useCallback, useEffect, useMemo, useState } from "react";
import { debounce, throttle } from "../../utils/performance";
import type { ChatEventPayload } from "../../api/ws/dto/chat/ChatEventDto";
import type { WebSocketEventResponseDto } from "../../api/ws/dto/WebSocketEventResponseDto";
import { useAuthStore } from "../../store/useAuthStore";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import type { LobbyEventPayload } from "../../api/ws/dto/lobby/LobbyEventDto";

const DEBOUNCE_TYPING_TIMEOUT = 1000; // 1 sec
const THROTTLE_TYPING_EVENT = 500; // 0.5 sec

export type ChatMessage = {
  type: "CONNECT" | "DISCONNECT" | "MESSAGE" | "LEAVE";
  sender: string;
  payload: string;
};

function webSocketEventToChatMessage(
  event: WebSocketEventResponseDto,
  username: string,
): ChatMessage {
  const messageType = event.type.split("_")[1] as ChatMessage["type"];

  switch (messageType) {
    case "CONNECT":
      return {
        type: messageType,
        sender: event.sender,
        payload:
          username === event.sender
            ? `You've connected`
            : `${(event.payload as LobbyEventPayload)!.playerName} connected`,
      };
    case "LEAVE":
      return {
        type: messageType,
        sender: event.sender,
        payload:
          username === event.sender
            ? `You've left`
            : `${(event.payload as LobbyEventPayload)!.playerName} disconnected`,
      };
    case "DISCONNECT":
      return {
        type: messageType,
        sender: event.sender,
        payload:
          username === event.sender
            ? `You've disconnected`
            : `${(event.payload as LobbyEventPayload)!.playerName} disconnected`,
      };
    case "MESSAGE":
      return {
        type: messageType,
        sender: event.sender,
        payload: (event.payload as ChatEventPayload)!.message,
      };
  }
}

export default function useLobbyChat(lobbyId: string) {
  const { client, status } = useWebSocketStore();
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const throttleTyping = useMemo(() => {
    return throttle(() => {
      client?.publish({
        destination: "/app/chat/:id/send",
        id: lobbyId,
        body: {
          type: "CHAT_TYPE",
        },
      });
    }, THROTTLE_TYPING_EVENT);
  }, [client]);

  const publishMessage = useCallback(
    (message: string) => {
      client?.publish({
        destination: "/app/chat/:id/send",
        id: lobbyId,
        body: {
          type: "CHAT_MESSAGE",
          message,
        },
      });
    },
    [client],
  );

  const publishTypingEvent = useCallback(() => {
    throttleTyping.fn();
  }, [client]);

  useEffect(() => {
    if (status !== "connected" || !client) return;

    const typingTimeout = debounce(() => {
      setTypingUser(null);
    }, DEBOUNCE_TYPING_TIMEOUT);

    const username = user!.username;

    client.subscribe({
      destination: "/topic/lobby/:id",
      id: lobbyId,
      onMessage: (message) => {
        const messageBody = message.body;

        if (
          messageBody.type === "CHAT_TYPE" ||
          messageBody.type === "CHAT_MESSAGE" ||
          messageBody.type === "LOBBY_DISCONNECT" ||
          messageBody.type === "LOBBY_CONNECT" ||
          messageBody.type === "LOBBY_LEAVE"
        ) {
          if (messageBody.type === "CHAT_TYPE") {
            if (messageBody.sender === username) return;
            setTypingUser(messageBody.sender);
            typingTimeout.fn();
            return;
          }

          if (messageBody.type === "CHAT_MESSAGE") {
            if (messageBody.sender !== username) {
              typingTimeout.cancel();
              setTypingUser(null);
            }
          }
          if (
            messageBody.type === "LOBBY_DISCONNECT" ||
            messageBody.type === "LOBBY_LEAVE"
          ) {
            if (messageBody.payload.playerName !== username) {
              typingTimeout.cancel();
              setTypingUser(null);
            }
          }

          const nextMessage = webSocketEventToChatMessage(
            messageBody,
            username,
          );

          setMessages((prev) => [...prev, nextMessage]);
        }
      },
    });

    return () => {
      typingTimeout.cancel();
    };
  }, [client, status]);

  return {
    messages,
    publishMessage,
    publishTypingEvent,
    typingUser,
    username: user!.username,
  };
}
