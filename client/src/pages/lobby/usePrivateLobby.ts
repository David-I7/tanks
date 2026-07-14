import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../errors/ApiError";
import type { WebSocketEventResponseDto } from "../../api/ws/dto/WebSocketEventResponseDto";
import type { EndpointSubscription } from "../../api/ws/TanksWebSocketClient";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import InvalidStateError from "../../errors/InvalidStateError";
import { useNavigate, useParams } from "react-router-dom";
import {
  useWebSocketStore,
  type ConnectionStatus,
} from "../../store/useWebSocketStore";
import { useAuthStore } from "../../store/useAuthStore";

export default function usePrivateLobby() {
  const { client, status, connect } = useWebSocketStore();
  const user = useAuthStore((state) => state.user);
  const getAuthStatus = useAuthStore((state) => state.getAuthStatus);
  const navigate = useNavigate();
  const { id: urlLobbyId } = useParams();
  const action = urlLobbyId ? "JOIN" : "CREATE";
  const [lobbyStatus, setLobbyStatus] =
    useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<ApiError | null>(null);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(action === "CREATE");
  const [playerCount, setPlayerCount] = useState<number>(0);
  const skipNextOwnConnectIncrement = useRef(false);

  useEffect(() => {
    if (!client) {
      connect();
      return;
    }

    if (status !== "connected") {
      return;
    }

    if (action === "JOIN" && urlLobbyId === undefined) {
      throw new InvalidStateError("Lobby ID must be provided to join a lobby");
    }

    let cancelled = false;
    let lobbyTopicCleanup: (() => void) | undefined;
    let repliesCleanup: (() => void) | undefined;
    let errorsCleanup: (() => void) | undefined;

    const subscribeToLobby = (id: string, onSubscribed?: () => void) => {
      lobbyTopicCleanup = client.subscribe({
        destination: "/topic/lobby/:id",
        id,
        onMessage: handleLobbyMessage,
      });
      onSubscribed?.();
    };

    let handleReply: EndpointSubscription<WebSocketEventResponseDto>["onMessage"] =
      (message) => {
        if (
          message.body.type === "LOBBY_CREATED" ||
          message.body.type === "LOBBY_JOINED"
        ) {
          subscribeToLobby(message.body.payload.id);
          return;
        }

        if (message.body.type === "GAME_CREATED") {
          client.clearSubscriptions();
          navigate(`/game/${message.body.payload.id}`, { replace: true });
          return;
        }
      };

    const handleLobbyMessage: EndpointSubscription<WebSocketEventResponseDto>["onMessage"] =
      (message) => {
        if (message.body.type === "LOBBY_CONNECT") {
          if (
            user!.username === message.body.payload.playerName &&
            skipNextOwnConnectIncrement.current
          ) {
            skipNextOwnConnectIncrement.current = false;
          } else {
            setPlayerCount((prev) => prev + 1);
          }
          if (user!.username === message.body.payload.playerName) {
            const lobbyId = message.body.payload["id"];
            setLobbyId(lobbyId);
            setLobbyStatus("connected");
          }
        }

        if (
          message.body.type === "LOBBY_DISCONNECT" ||
          message.body.type === "LOBBY_LEAVE"
        ) {
          setPlayerCount(1);
          setIsHost(true);
        }
      };

    repliesCleanup = client.subscribe({
      destination: "/user/queue/replies",
      onMessage: handleReply,
    });

    errorsCleanup = client.subscribe<ProblemDetailDto>({
      destination: "/user/queue/errors",
      onMessage: (message) => {
        setError(new ApiError(message.body, message.body.status));
      },
    });

    void (async () => {
      if (action === "CREATE") {
        client.publish({ destination: "/app/lobby/create/private" });
        return;
      }

      const authStatus = await getAuthStatus();
      if (cancelled) return;

      const session = authStatus?.userSessionStatus;
      if (session?.state === "IN_LOBBY" && session.lobbyId === urlLobbyId) {
        subscribeToLobby(urlLobbyId, () => {
          setLobbyId(urlLobbyId);
          setPlayerCount(session.lobbyPlayerCount ?? 1);
          setIsHost(session.lobbyHostId === user?.id);
          skipNextOwnConnectIncrement.current = true;
        });
        return;
      }

      navigate("/", { replace: true });
    })();

    return () => {
      cancelled = true;
      lobbyTopicCleanup?.();
      repliesCleanup?.();
      errorsCleanup?.();
    };
  }, [
    action,
    client,
    getAuthStatus,
    navigate,
    status,
    urlLobbyId,
    user?.id,
    user?.username,
  ]);

  useEffect(() => {
    if (
      (status === "disconnecting" || status === "disconnected") &&
      lobbyStatus === "connected"
    ) {
      setLobbyStatus(status);
    }
  }, [status, lobbyStatus]);

  const createGame = () => {
    if (isHost && playerCount === 2) {
      client?.publish({
        destination: "/app/game/create",
      });
    }
  };

  return {
    action,
    lobbyStatus,
    error,
    lobbyId,
    username: user?.username || "",
    hostShareLink:
      isHost && lobbyId ? `${window.location.origin}/lobby/${lobbyId}` : null,
    canStartGame: isHost && playerCount === 2,
    isHost,
    playerCount,
    createGame,
  };
}
