import { useEffect, useState } from "react";
import { ApiError } from "../../errors/ApiError";
import type { WebSocketEventResponseDto } from "../../api/ws/dto/WebSocketEventResponseDto";
import type { EndpointSubscription } from "../../api/ws/TanksWebSocketClient";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import InvalidStateError from "../../errors/InvalidStateError";
import { useNavigate, useParams } from "react-router-dom";
import { useWebSocketStore, type ConnectionStatus } from "../../store/useWebSocketStore";
import { useAuthStore } from "../../store/useAuthStore";

export default function usePrivateLobby() {
  const { client, status, connect, error: wsError } = useWebSocketStore();
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const { id: urlLobbyId } = useParams();
  const action = urlLobbyId ? "JOIN" : "CREATE";
  const [lobbyStatus, setLobbyStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<ApiError | null>(null);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(action === "CREATE");
  const [playerCount, setPlayerCount] = useState<number>(0);

  useEffect(() => {
    if (!client) {
      connect();
      return
    }

    if (status !== "connected") {
      return;
    }

    if (action === "JOIN" && urlLobbyId === undefined) {
      throw new InvalidStateError(
        "Lobby ID must be provided to join a lobby",
      );
    }

    let handleReply: EndpointSubscription<WebSocketEventResponseDto>["onMessage"] = (message) => {
      if (message.body.type === "LOBBY_CREATED" || message.body.type === "LOBBY_JOINED") {
        client.subscribe({
          destination: "/topic/lobby/:id",
          id: message.body.payload.id,
          onMessage: handleLobbyMessage,
        });
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
          setPlayerCount(prev => prev + 1);
          if (user!.username === message.body.payload.playerName) {
            const lobbyId = message.body.payload["id"];
            setLobbyId(lobbyId);
            setLobbyStatus("connected");
          }
        }

        if (message.body.type === "LOBBY_DISCONNECT") {
          setPlayerCount(1);
          setIsHost(true);
        }
      };

    client.subscribe({
      destination: "/user/queue/replies",
      onMessage: handleReply,
    });

    client.subscribe<ProblemDetailDto>({
      destination: "/user/queue/errors",
      onMessage: (message) => {
        setError(new ApiError(message.body, message.body.status));
      },
    });

    if (action === "CREATE") {
      client.publish({ destination: "/app/lobby/create/private" });
    } else {
      client.publish({
        destination: "/app/lobby/join/private/:id",
        id: urlLobbyId,
      });
    }

  }, [client, status]);

  useEffect(() => {
    if ((status === "disconnecting" || status === "disconnected") && lobbyStatus === "connected") {
      setLobbyStatus(status);
    }
  }, [status, lobbyStatus]);

  const createGame = () => {
    if (isHost && playerCount === 2) {
      client?.publish({
        destination: "/app/game/create"
      })
    };
  }

  const leaveGame = () => {
    if (lobbyStatus === "connected") {
      client?.publish({ destination: "/app/lobby/leave" })
      setLobbyStatus("disconnected")
    }
  }

  return { action, lobbyStatus, error, lobbyId, username: user?.username || "", hostShareLink: isHost && lobbyId ? `${window.location.origin}/lobby/${lobbyId}` : null, canStartGame: isHost && playerCount === 2, isHost, playerCount, createGame };
}
