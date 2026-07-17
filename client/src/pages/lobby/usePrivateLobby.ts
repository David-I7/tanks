import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../errors/ApiError";
import type { WebSocketEventResponseDto } from "../../api/ws/dto/WebSocketEventResponseDto";
import type {
  EndpointSubscription,
  Message,
} from "../../api/ws/TanksWebSocketClient";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import InvalidStateError from "../../errors/InvalidStateError";
import { useNavigate, useParams } from "react-router-dom";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useAuthStore } from "../../store/useAuthStore";
import type WebSocketError from "../../errors/WebSocketError";
import { useSubscriptionGroup } from "../../hooks/useSubscriptionGroup";
import type { LobbyEvent } from "../../api/ws/dto/lobby/LobbyEventDto";

type LobbyState =
  | {
      error: null;
      id: string | null;
      state:
        | "connecting_to_lobby"
        | "waiting_for_players"
        | "ready_to_start"
        | "creating_game";
      playerCount: number;
      isHost: boolean;
      isOnLobbyPage: boolean;
      leaveLobby: () => void;
      retry: () => void;
      startGame: () => void;
    }
  | {
      error: ApiError | WebSocketError;
      id: string | null;
      state: "error";
      playerCount: number;
      isHost: boolean;
      isOnLobbyPage: boolean;
      leaveLobby: () => void;
      retry: () => void;
      startGame: () => void;
    };

export default function usePrivateLobby() {
  const {
    subscribe,
    send,
    status: webSocketStatus,
    connect,
    disconnect,
    error: webSocketError,
  } = useWebSocketStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { id: urlLobbyId } = useParams();
  const action = urlLobbyId ? "JOIN" : "CREATE";
  const { add, cleanup } = useSubscriptionGroup();
  const [lobbyState, setLobbyState] = useState<LobbyState>({
    error: null,
    id: null,
    state: "connecting_to_lobby",
    playerCount: 0,
    isHost: action === "CREATE",
    isOnLobbyPage: action === "JOIN",
    leaveLobby: () => {
      disconnect();
    },
    retry: () => {
      if (webSocketStatus !== "disconnected" || lobbyState.state !== "error")
        return;
      connect();
      setLobbyState((prev) => ({
        ...prev,
        error: null,
        id: null,
        state: "connecting_to_lobby",
        playerCount: 0,
        isHost: action === "CREATE",
        isOnLobbyPage: action === "JOIN",
      }));
    },
    startGame: () => {
      if (lobbyState.state !== "ready_to_start" || !lobbyState.isHost) return;
      send({
        destination: "/app/game/create",
      });
      setLobbyState((prev) => ({
        ...prev,
        state: "creating_game",
        error: null,
      }));
    },
  });

  if (action === "JOIN" && urlLobbyId === undefined) {
    throw new InvalidStateError("Lobby ID must be provided to join a lobby");
  }

  useEffect(() => {
    if (webSocketError) {
      setLobbyState((prev) => ({
        ...prev,
        playerCount: 0,
        isHost: false,
        id: null,
        error: webSocketError,
        state: "error",
      }));
      disconnect();
    }
  }, [webSocketError]);

  useEffect(() => {
    const isConnected = webSocketStatus === "connected";

    if (!isConnected) {
      connect();
      return;
    }

    const handleLobbyConnect = (message: Message<LobbyEvent>) => {
      setLobbyState((prev) => {
        const nextPlayerCount = prev.playerCount + 1;
        const isHost = message.body.payload.hostName === user!.username;
        return {
          ...prev,
          id: message.body.payload.id,
          playerCount: nextPlayerCount,
          isHost,
          state:
            nextPlayerCount === 2 ? "ready_to_start" : "waiting_for_players",
          error: null,
        };
      });
    };
    const handleLobbyDisconnect = (message: Message<LobbyEvent>) => {
      setLobbyState((prev) => {
        const nextPlayerCount = prev.playerCount - 1;
        const isHost = message.body.payload.hostName === user!.username;
        return {
          ...prev,
          id: message.body.payload.id,
          playerCount: nextPlayerCount,
          isHost,
          state:
            nextPlayerCount === 2 ? "ready_to_start" : "waiting_for_players",
          error: null,
        };
      });
    };

    const handleLobbyMessage: EndpointSubscription<WebSocketEventResponseDto>["onMessage"] =
      (message) => {
        if (message.body.type === "LOBBY_CONNECT") {
          handleLobbyConnect(message as Message<LobbyEvent>);
          return;
        }
        if (
          message.body.type === "LOBBY_DISCONNECT" ||
          message.body.type === "LOBBY_LEAVE"
        ) {
          handleLobbyDisconnect(message as Message<LobbyEvent>);
          return;
        }
      };

    const handleLobbyJoinOrCreate = (message: Message<LobbyEvent>) => {
      add(
        subscribe({
          destination: "/topic/lobby/:id",
          id: message.body.payload.id,
          onMessage: handleLobbyMessage,
        }),
      );
    };

    let handleUserReplies: EndpointSubscription<WebSocketEventResponseDto>["onMessage"] =
      (message) => {
        if (
          message.body.type === "LOBBY_CREATED" ||
          message.body.type === "LOBBY_JOINED"
        ) {
          handleLobbyJoinOrCreate(message as Message<LobbyEvent>);
          return;
        }

        if (message.body.type === "GAME_CREATED") {
          navigate(`/game/${message.body.payload.id}`, { replace: true });
          return;
        }
      };

    add(
      subscribe({
        destination: "/user/queue/replies",
        onMessage: handleUserReplies,
      }),
    );

    add(
      subscribe<ProblemDetailDto>({
        destination: "/user/queue/errors",
        onMessage: (message) => {
          setLobbyState((prev) => ({
            ...prev,
            error: new ApiError(message.body, message.body.status),
            playerCount: 0,
            isHost: false,
            id: null,
            state: "error",
          }));
          disconnect();
        },
      }),
    );

    if (action === "CREATE") {
      send({ destination: "/app/lobby/create/private" });
    } else if (action === "JOIN") {
      send({
        destination: "/app/lobby/join/private/:id",
        id: urlLobbyId!,
      });
    }

    return () => {
      if (!isConnected) return;
      cleanup();
    };
  }, [webSocketStatus === "connected"]);

  return {
    ...lobbyState,
    username: user!.username,
    shareLink:
      lobbyState.isHost && lobbyState.id
        ? `${window.location.origin}/lobby/${lobbyState.id}`
        : null,
    canStartGame: lobbyState.isHost && lobbyState.playerCount === 2,
  };
}
