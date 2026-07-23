import { useEffect, useMemo, useState } from "react";
import { debounce, throttle } from "../../utils/performance";
import {
  isChatEvent,
  type ChatEvent,
} from "../../api/ws/dto/chat/ChatEventDto";
import { useAuthStore } from "../../store/useAuthStore";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import {
  isLobbyEvent,
  type LobbyEvent,
} from "../../api/ws/dto/lobby/LobbyEventDto";
import { useSubscriptionGroup } from "../../hooks/useSubscriptionGroup";
import type { ApiError } from "../../errors/ApiError";
import type WebSocketError from "../../errors/WebSocketError";
import InvalidStateError from "../../errors/InvalidStateError";

const DEBOUNCE_TYPING_TIMEOUT = 1000; // 1 sec
const THROTTLE_TYPING_EVENT = 500; // 0.5 sec

export type ChatMessage = {
  type: "CONNECT" | "DISCONNECT" | "MESSAGE" | "LEAVE";
  sender: string;
  payload: string;
};

function toUiMessage(
  event: LobbyEvent | ChatEvent,
  username: string,
): ChatMessage {
  if (
    event.type !== "LOBBY_CONNECT" &&
    event.type !== "LOBBY_DISCONNECT" &&
    event.type !== "LOBBY_LEAVE" &&
    event.type !== "CHAT_MESSAGE" &&
    event.type !== "CHAT_TYPE"
  ) {
    throw new Error(`Invalid event type: ${event.type}`);
  }

  const sender = event.payload.triggeredBy;

  switch (event.type) {
    case "LOBBY_CONNECT":
      return {
        type: "CONNECT",
        sender,
        payload:
          username === sender ? `You've connected` : `${sender} connected`,
      };
    case "LOBBY_LEAVE":
      return {
        type: "LEAVE",
        sender,
        payload: username === sender ? `You've left` : `${sender} left`,
      };
    case "LOBBY_DISCONNECT":
      return {
        type: "DISCONNECT",
        sender,
        payload:
          username === sender
            ? `You've disconnected`
            : `${sender} disconnected`,
      };
    case "CHAT_MESSAGE":
      return {
        type: "MESSAGE",
        sender,
        payload: event.payload.message,
      };
  }

  throw new InvalidStateError(`Invalid event type: ${event.type}`);
}

type LobbyChatState = {
  messages: ChatMessage[];
  typingUser: string | null;
  messageError: ApiError | null;
  messageState: "sent" | "error" | "sending" | "initial";
};

export default function useLobbyChat(lobbyId: string) {
  const {
    subscribe,
    send,
    status,
    status: webSocketStatus,
  } = useWebSocketStore();
  const user = useAuthStore((state) => state.user);
  const [lobbyState, setLobbyState] = useState<LobbyChatState>({
    messages: [],
    typingUser: null,
    messageError: null,
    messageState: "initial",
  });
  const { add, cleanup } = useSubscriptionGroup();

  const { fn: publishTypingEvent, cancel: cancelTypingEvent } = useMemo(
    () =>
      throttle(() => {
        if (status !== "connected") return;
        send({
          destination: "/app/chat/:id/send",
          id: lobbyId,
          body: {
            type: "CHAT_TYPE",
          },
        });
      }, THROTTLE_TYPING_EVENT),
    [webSocketStatus === "connected"],
  );

  const publishMessage = (message: string) => {
    if (status !== "connected") return;
    send({
      destination: "/app/chat/:id/send",
      id: lobbyId,
      body: {
        type: "CHAT_MESSAGE",
        message,
      },
    });
    setLobbyState((prev) => {
      return { ...prev, messageState: "sending", messageError: null };
    });
  };

  useEffect(() => {
    const isConnected = status === "connected";
    if (!isConnected) return;

    const {
      fn: debounceRemoveTypingIndicator,
      cancel: cancelDebounceRemoveTypingIndicator,
    } = debounce(() => {
      setLobbyState((prev) => ({
        ...prev,
        typingUser: null,
      }));
    }, DEBOUNCE_TYPING_TIMEOUT);

    const username = user!.username;

    add(
      subscribe({
        destination: "/topic/lobby/:id",
        id: lobbyId,
        onMessage: (message) => {
          const messageBody = message.body;

          if (isChatEvent(messageBody) || isLobbyEvent(messageBody)) {
            if (
              messageBody.type !== "CHAT_MESSAGE" &&
              messageBody.type !== "CHAT_TYPE" &&
              messageBody.type !== "LOBBY_DISCONNECT" &&
              messageBody.type !== "LOBBY_LEAVE" &&
              messageBody.type !== "LOBBY_CONNECT"
            )
              return;

            if (messageBody.type === "CHAT_TYPE") {
              if (messageBody.payload.triggeredBy === username) return;
              setLobbyState((prev) => ({
                ...prev,
                typingUser: messageBody.payload.triggeredBy,
              }));
              debounceRemoveTypingIndicator();
              return;
            } else if (messageBody.type === "CHAT_MESSAGE") {
              if (messageBody.payload.triggeredBy === username) {
                setLobbyState((prev) => ({
                  ...prev,
                  messageState: "sent",
                  messageError: null,
                }));
              } else {
                cancelDebounceRemoveTypingIndicator();
                setLobbyState((prev) => ({
                  ...prev,
                  typingUser: null,
                }));
              }
            } else if (
              messageBody.type === "LOBBY_DISCONNECT" ||
              messageBody.type === "LOBBY_LEAVE"
            ) {
              if (messageBody.payload.triggeredBy !== username) {
                cancelDebounceRemoveTypingIndicator();
                setLobbyState((prev) => ({
                  ...prev,
                  typingUser: null,
                }));
              }
            }

            const uiMessage = toUiMessage(messageBody, username);

            setLobbyState((prev) => {
              return {
                ...prev,
                messages: [...prev.messages, uiMessage],
                messageState:
                  prev.messageState === "sending" ? "sent" : prev.messageState,
                messageError: null,
              };
            });
          }
        },
      }),
    );

    return () => {
      if (isConnected) {
        cleanup();
      }
      cancelDebounceRemoveTypingIndicator();
      cancelTypingEvent();
    };
  }, [webSocketStatus === "connected"]);

  return {
    ...lobbyState,
    publishMessage,
    publishTypingEvent,
    username: user!.username,
  };
}
