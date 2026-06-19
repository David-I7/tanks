import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { debounce, throttle } from "../../utils/performance";
import type { ChatEventPayload } from "../../api/ws/dto/chat/ChatEventDto";
import type { WebSocketEventResponseDto } from "../../api/ws/dto/WebSocketEventResponseDto";
import { useAuthStore } from "../../store/useAuthStore";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import type { SubscriptionCleanup } from "../../api/ws/TanksWebSocketClient";

const DEBOUNCE_TYPING_TIMEOUT = 1000; // 1 sec
const THROTTLE_TYPING_EVENT = 500; // 0.5 sec

export type ChatMessage = {
  type: "CONNECT" | "DISCONNECT" | "MESSAGE";
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
            : `${username} connected`,
      };
    case "DISCONNECT":
      return {
        type: messageType,
        sender: event.sender,
        payload:
          username === event.sender
            ? `You've disconnected`
            : `${username} disconnected`,
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
  const { client, connected: wsConnected } = useWebSocketStore();
  const user = useAuthStore(state => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const subscriptions = useRef<SubscriptionCleanup[]>([]);

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
    if (!wsConnected || !client) return;

    const typingTimeout = debounce(() => {
      setTypingUser(null);
    }, DEBOUNCE_TYPING_TIMEOUT);

    const username = user!.username;

    subscriptions.current.push(client.subscribe({
      destination: "/topic/lobby/:id",
      id: lobbyId,
      onMessage: (message) => {
        const messageBody = message.body;

        if (
          messageBody.type === "CHAT_TYPE" ||
          messageBody.type === "CHAT_MESSAGE" ||
          messageBody.type === "LOBBY_DISCONNECT" ||
          messageBody.type === "LOBBY_CONNECT"
        ) {
          if (messageBody.type === "CHAT_TYPE") {
            if (messageBody.sender === username) return;
            setTypingUser(messageBody.sender);
            typingTimeout.fn();
            return;
          }

          if (
            messageBody.type === "CHAT_MESSAGE"
          ) {
            if (messageBody.sender !== username) {
              typingTimeout.cancel();
              setTypingUser(null);
            }
          }
          if (
            messageBody.type === "LOBBY_DISCONNECT"
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
    }));

    return () => {
      typingTimeout.cancel();
    };
  }, [client, wsConnected]);

  useEffect(() => {
    return () => {
      if (client) {
        subscriptions.current.forEach(cleanup => cleanup());
        subscriptions.current = [];
      }
    }
  }, [client])

  return {
    messages,
    publishMessage,
    publishTypingEvent,
    typingUser,
    username: user!.username,
  };
}
