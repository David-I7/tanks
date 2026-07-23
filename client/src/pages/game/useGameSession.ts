import { useEffect, useState } from "react";
import { ApiError } from "../../errors/ApiError";
import type WebSocketError from "../../errors/WebSocketError";
import { useSubscriptionGroup } from "../../hooks/useSubscriptionGroup";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useAuthStore } from "../../store/useAuthStore";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import type { GameEvent } from "../../api/ws/dto/game/GameEventDto";
import type { Message } from "../../api/ws/TanksWebSocketClient";
import { useNavigate } from "react-router-dom";

type GameState =
  | {
      error: null;
      state:
        | "connecting_to_game"
        | "reconnecting_to_game"
        | "starting_game"
        | "in_game"
        | "game_over";
    }
  | {
      error: ApiError | WebSocketError;
      state: "error";
    };

export default function useGameSession(gameSessionId: string) {
  const {
    subscribe,
    status: webSocketStatus,
    connect,
    disconnect,
    error: webSocketError,
  } = useWebSocketStore();
  const { add, cleanup } = useSubscriptionGroup();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>({
    error: null,
    state: "connecting_to_game",
  });
  const user = useAuthStore((state) => state.user);

  const forfitGame = () => {
    disconnect();
    navigate("/");
  };

  const retryJoin = () => {
    if (webSocketStatus !== "disconnected" || gameState.state !== "error")
      return;

    setGameState((prev) => ({
      ...prev,
      error: null,
      state: "reconnecting_to_game",
    }));
    connect();
  };

  function handleGameConnect(_message: Message<GameEvent>) {
    setGameState((prev) => ({
      ...prev,
      state:
        prev.state === "reconnecting_to_game" ? "in_game" : "starting_game",
      error: null,
    }));
  }

  function handleGameLeave(message: Message<GameEvent>) {
    if (message.body.payload.triggeredBy === user?.username) return;
  }

  useEffect(() => {
    if (webSocketStatus === "disconnected") {
      connect();
    }
  }, []);

  useEffect(() => {
    if (webSocketStatus === "reconnecting") {
      setGameState(() => ({
        error: null,
        state: "reconnecting_to_game",
      }));
    }
  }, [webSocketStatus]);

  useEffect(() => {
    if (webSocketError) {
      setGameState((prev) => ({
        ...prev,
        error: webSocketError,
        state: "error",
      }));
    }
  }, [webSocketError]);

  useEffect(() => {
    const isConnected = webSocketStatus === "connected";

    if (!isConnected) return;

    const handleGameTopicMessage = (message: Message<GameEvent>) => {
      if (message.body.type === "GAME_CONNECT") {
        handleGameConnect(message);
      }

      if (
        message.body.type === "GAME_DISCONNECT" ||
        message.body.type === "GAME_LEAVE"
      ) {
        handleGameLeave(message);
      }
    };

    add(
      subscribe({
        destination: "/topic/game/:id",
        id: gameSessionId,
        onMessage: handleGameTopicMessage,
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
          disconnect();
        },
      }),
    );

    return () => {
      if (!isConnected) return;
      cleanup();
    };
  }, [webSocketStatus === "connected"]);

  return { ...gameState, forfitGame, retryJoin };
}
