import { useEffect, useRef, useState } from "react";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import { ApiError } from "../../errors/ApiError";
import type {
  Message,
  SubscriptionCleanup,
} from "../../api/ws/TanksWebSocketClient";
import { useNavigate } from "react-router-dom";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useAuthStore } from "../../store/useAuthStore";
import type { LobbyEvent } from "../../api/ws/dto/lobby/LobbyEventDto";
import { useScreenStack } from "../../context/ScreenStack";
import type WebSocketError from "../../errors/WebSocketError";
import { useSubscriptionGroup } from "../../hooks/useSubscriptionGroup";

type LobbyState =
  | {
      error: null;
      state: "connecting_to_lobby" | "searching_for_players" | "creating_game";
      playerCount: number;
      leaveLobby: () => void;
      retryLobbyJoin: () => void;
    }
  | {
      error: ApiError | WebSocketError;
      state: "error";
      playerCount: number;
      leaveLobby: () => void;
      retryLobbyJoin: () => void;
    };

export default function useQuickMatchLobby() {
  const {
    send,
    subscribe,
    status: webSocketStatus,
    connect,
    disconnect,
    error: webSocketError,
  } = useWebSocketStore();
  const { add, cleanup } = useSubscriptionGroup();

  const leaveLobby = () => {
    disconnect();
    popScreen();
  };

  const retryLobbyJoin = () => {
    if (webSocketStatus !== "disconnected" || lobbyState.state !== "error")
      return;
    connect();
    setLobbyState((prev) => ({
      ...prev,
      error: null,
      state: "connecting_to_lobby",
    }));
  };

  const [lobbyState, setLobbyState] = useState<LobbyState>({
    error: null,
    state: "connecting_to_lobby",
    playerCount: 0,
    leaveLobby,
    retryLobbyJoin,
  });
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { popScreen } = useScreenStack();

  function handleLobbyConnect(message: Message<LobbyEvent>) {
    setLobbyState((prev) => {
      const next = prev.playerCount + 1;
      const isHost = message.body.payload.hostName === user!.username;

      if (isHost && next === 2) {
        send({ destination: "/app/game/create" });
        return { ...prev, playerCount: 2, state: "creating_game", error: null };
      }

      return {
        ...prev,
        playerCount: 1,
        state: "searching_for_players",
        error: null,
      };
    });
  }

  useEffect(() => {
    const isConnected = webSocketStatus === "connected";

    if (!isConnected) {
      connect();
      return;
    }

    const handleLobbyTopicMessage = (message: Message<LobbyEvent>) => {
      if (message.body.type === "LOBBY_CONNECT") {
        handleLobbyConnect(message);
      }

      if (
        message.body.type === "LOBBY_DISCONNECT" ||
        message.body.type === "LOBBY_LEAVE"
      ) {
        if (message.body.payload.triggeredBy === user!.username) return;
        setLobbyState((prev) => ({
          ...prev,
          playerCount: 1,
          state: "searching_for_players",
          error: null,
        }));
      }
    };

    add(
      subscribe({
        destination: "/user/queue/replies",
        onMessage: (message) => {
          if (
            message.body.type === "LOBBY_JOINED" ||
            message.body.type === "LOBBY_CREATED"
          ) {
            add(
              subscribe({
                destination: "/topic/lobby/:id",
                id: message.body.payload.id,
                onMessage: handleLobbyTopicMessage,
              }),
            );
          }

          if (message.body.type === "GAME_CREATED") {
            navigate(`/game/${message.body.payload.id}`);
          }
        },
      }),
    );

    add(
      subscribe<ProblemDetailDto>({
        destination: "/user/queue/errors",
        onMessage: (message) => {
          setLobbyState((prev) => ({
            ...prev,
            error: new ApiError(message.body, message.body.status),
            state: "error",
          }));
          disconnect();
        },
      }),
    );

    send({ destination: "/app/lobby/quick-match" });

    return () => {
      if (!isConnected) return;
      cleanup();
    };
  }, [webSocketStatus === "connected"]);

  useEffect(() => {
    if (webSocketError) {
      setLobbyState((prev) => ({
        ...prev,
        error: webSocketError,
        state: "error",
      }));
      disconnect();
    }
  }, [webSocketError]);

  return lobbyState;
}
