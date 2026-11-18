import { useCallback, useEffect, useReducer } from "react";
import { isChatEvent } from "@/api/ws/dto/chat/ChatEventDto";
import { isLobbyEvent } from "@/api/ws/dto/lobby/LobbyEventDto";
import { useSubscriptionGroup } from "@/hooks/useSubscriptionGroup";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { mapTopicEventToChat } from "./chatEventMapper";
import {
  chatReducer,
  INITIAL_CHAT_STATE,
  type ChatMessage,
} from "./chatReducer";
import { useTypingIndicator } from "./useTypingIndicator";

export type { ChatMessage };

export type LobbyChatController = {
  messages: ChatMessage[];
  typingUser: string | null;
  username: string;
  publishMessage: (message: string) => void;
  publishTypingEvent: () => void;
};

export default function useLobbyChat(
  lobbyId: string | null,
): LobbyChatController {
  const { subscribe, send, status } = useWebSocketStore();
  const player = usePlayerStore((s) => s.player);
  const isConnected = status === "connected";

  const [chatState, dispatch] = useReducer(chatReducer, INITIAL_CHAT_STATE);
  const { add, cleanup } = useSubscriptionGroup();

  const handleSendTyping = useCallback(
    (activeLobbyId: string) => {
      send({
        destination: "/app/chat/:id/send",
        id: activeLobbyId,
        body: { type: "CHAT_TYPE" },
      });
    },
    [send],
  );

  const handleClearTyping = useCallback(() => {
    dispatch({ type: "CLEAR_TYPING_USER" });
  }, []);

  const { publishTypingEvent, scheduleClearTyping, cancelClearTyping } =
    useTypingIndicator({
      isConnected,
      lobbyId,
      onSendTyping: handleSendTyping,
      onClearTyping: handleClearTyping,
    });

  const publishMessage = useCallback(
    (message: string) => {
      if (!isConnected || !lobbyId) return;
      send({
        destination: "/app/chat/:id/send",
        id: lobbyId,
        body: {
          type: "CHAT_MESSAGE",
          message,
        },
      });
    },
    [isConnected, lobbyId, send],
  );

  useEffect(() => {
    if (!isConnected || !lobbyId) return;

    add(
      subscribe({
        destination: "/topic/lobby/:id",
        id: lobbyId,
        onMessage: (message) => {
          const body = message.body;
          if (!isChatEvent(body) && !isLobbyEvent(body)) return;

          const mapped = mapTopicEventToChat(
            body,
            player.nickname,
            player.playerId,
          );

          if (mapped.kind === "typing") {
            dispatch({ type: "SET_TYPING_USER", username: mapped.username });
            scheduleClearTyping();
            return;
          }

          if (mapped.kind === "message") {
            if (mapped.clearTyping) {
              cancelClearTyping();
              dispatch({ type: "CLEAR_TYPING_USER" });
            }
            dispatch({ type: "APPEND_MESSAGE", message: mapped.message });
          }
        },
      }),
    );

    return () => {
      cleanup();
    };
  }, [
    isConnected,
    lobbyId,
    player.nickname,
    player.playerId,
    add,
    cleanup,
    subscribe,
    scheduleClearTyping,
    cancelClearTyping,
  ]);

  return {
    messages: chatState.messages,
    typingUser: chatState.typingUser,
    username: player.nickname,
    publishMessage,
    publishTypingEvent,
  };
}
