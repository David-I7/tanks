import { useEffect, useState } from "react";
import { ApiError } from "../../errors/ApiError";
import type WebSocketError from "../../errors/WebSocketError";
import { useSubscriptionGroup } from "../../hooks/useSubscriptionGroup";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useAuthStore } from "../../store/useAuthStore";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import type { GameEvent } from "../../api/ws/dto/game/GameEventDto";
import type { Message } from "../../api/ws/TanksWebSocketClient";

type GameState =
  | {
      error: null;
      state: "connecting_to_lobby" | "searching_for_players" | "creating_game";
      playerCount: number;
    }
  | {
      error: ApiError | WebSocketError;
      state: "error";
      playerCount: number;
    };

export default function useGameLobby() {
  const {
    send,
    subscribe,
    status: webSocketStatus,
    connect,
    disconnect,
    error: webSocketError,
  } = useWebSocketStore();
  const { add, cleanup } = useSubscriptionGroup();

  const [gameState, setGameState] = useState<GameState>({
    error: null,
    state: "connecting_to_lobby",
    playerCount: 0,
  });
  const user = useAuthStore((state) => state.user);

  const leaveGame = () => {
    disconnect();
  };

  const retryLobbyJoin = () => {
    if (webSocketStatus !== "disconnected" || gameState.state !== "error")
      return;

    setGameState((prev) => ({
      ...prev,
      error: null,
      playerCount: 0,
      state: "connecting_to_lobby",
    }));
  };

  function handleLobbyConnect(message: Message<GameEvent>) {
    setGameState((prev) => {
      const next = prev.playerCount + 1;
      const isHost = message.body.payload.hostId === user!.id;

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
    if (gameState.error !== null) return;
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
        setGameState((prev) => ({
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
          setGameState((prev) => ({
            ...prev,
            error: new ApiError(message.body, message.body.status),
            state: "error",
          }));
        },
      }),
    );

    send({ destination: "/app/lobby/quick-match" });

    return () => {
      if (!isConnected) return;
      cleanup();
    };
  }, [webSocketStatus === "connected", gameState.error === null]);

  useEffect(() => {
    if (webSocketError) {
      setGameState((prev) => ({
        ...prev,
        error: webSocketError,
        state: "error",
      }));
      disconnect();
    }
  }, [webSocketError]);

  return { ...gameState, leaveGame, retryLobbyJoin };
}
