import { useEffect, useState } from "react";
import { ApiError } from "../../errors/ApiError";
import type WebSocketError from "../../errors/WebSocketError";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import {
  createOnlineGameManager,
  createOnlineGameplayTransport,
  type GameManager,
  type OnlineGameplayTransport,
  ResourceManager,
} from "../../game";

export type SessionStatus =
  | "connecting_to_game"
  | "reconnecting_to_game"
  | "starting_game"
  | "in_game"
  | "game_over"
  | "error";

export default function useGameSession(gameSessionId: string) {
  const {
    send,
    subscribe,
    status: webSocketStatus,
    connect,
    disconnect,
    error: webSocketError,
  } = useWebSocketStore();

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("connecting_to_game");
  const [opponentDisconnected, setOpponentDisconnected] =
    useState<boolean>(false);
  const [gameManager, setGameManager] = useState<GameManager | null>(null);
  const [gameplayTransport, setGameplayTransport] =
    useState<OnlineGameplayTransport | null>(null);
  const [error, setError] = useState<ApiError | WebSocketError | null>(null);

  const forfeitGame = () => {
    send({
      destination: `/app/game/:id/forfeit`,
      id: gameSessionId,
    });
  };

  const retryJoin = () => {
    if (webSocketStatus !== "disconnected" || sessionStatus !== "error") return;

    setError(null);
    setSessionStatus("reconnecting_to_game");
    connect();
  };

  useEffect(() => {
    if (webSocketStatus === "disconnected") {
      connect();
    }
  }, []);

  useEffect(() => {
    if (webSocketStatus === "reconnecting") {
      setError(null);
      setSessionStatus("reconnecting_to_game");
    }
  }, [webSocketStatus]);

  useEffect(() => {
    if (webSocketError) {
      setError(webSocketError);
      setSessionStatus("error");
    }
  }, [webSocketError]);

  useEffect(() => {
    const isConnected = webSocketStatus === "connected";
    if (!isConnected) return;

    const transport = createOnlineGameplayTransport({
      client: { send, subscribe },
      gameSessionId,
    });

    const manager = createOnlineGameManager({
      transport,
      ctx: {
        clock: () => performance.now(),
        generateIntentId: () =>
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `intent-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        gameContent: ResourceManager.getInstance().getGameContent(),
      },
    });

    setGameplayTransport(transport);
    setGameManager(manager);

    const unsubscribeManager = manager.subscribe((state) => {
      setSessionStatus((prev) => {
        if (state.match.phase === "gameOver") return "game_over";
        if (prev !== "in_game" && prev !== "game_over") return "in_game";
        return prev;
      });
    });

    const unsubscribeEvents = transport.subscribeToGameEvents((event) => {
      if (event && event.type === "GAME_DISCONNECT") {
        setOpponentDisconnected(true);
      } else if (event && event.type === "GAME_CONNECT") {
        setOpponentDisconnected(false);
      }
    });

    const unsubscribeErrors = subscribe<ProblemDetailDto>({
      destination: "/user/queue/errors",
      onMessage: (message) => {
        setError(new ApiError(message.body, message.body.status));
        setSessionStatus("error");
        disconnect();
      },
    });

    return () => {
      if (!isConnected) return;
      unsubscribeManager();
      unsubscribeEvents();
      unsubscribeErrors();
      manager.destroy();
      transport.destroy();
      setGameManager(null);
      setGameplayTransport(null);
    };
  }, [webSocketStatus === "connected", gameSessionId]);

  return {
    sessionStatus,
    state: sessionStatus,
    opponentDisconnected,
    gameManager,
    gameplayTransport,
    error,
    forfeitGame,
    retryJoin,
  };
}
