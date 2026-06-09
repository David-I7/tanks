import { useEffect, useState } from "react";
import { useWebSocket } from "../../context/WebSocketContext";
import { ApiError } from "../../errors/ApiError";
import type { WebSocketEventResponseDto } from "../../api/ws/dto/WebSocketEventResponseDto";
import type { EndpointSubscription } from "../../api/ws/TanksWebSocketClient";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import { useAuth } from "../../context/AuthContext";
import InvalidStateError from "../../errors/InvalidStateError";
import { useParams } from "react-router-dom";

export default function useLobby() {
  const { client, connected: wsConnected } = useWebSocket();
  const { user } = useAuth();
  const { id: urlLobbyId } = useParams();
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lobbyId, setLobbyId] = useState<string | null>(null);

  const action = urlLobbyId ? "JOIN" : "CREATE";

  useEffect(() => {
    if (!wsConnected) return;

    let handleReply: EndpointSubscription<WebSocketEventResponseDto>["onMessage"];
    const handleLobbyConnect: EndpointSubscription<WebSocketEventResponseDto>["onMessage"] =
      (message) => {
        if (message.body.type === "LOBBY_CONNECT") {
          if (user!.username === message.body.sender) {
            setConnected(true);
            setLobbyId(message.body.payload["id"]);
          }
        }
      };

    if (action === "CREATE") {
      handleReply = (message) => {
        if (message.body.type === "LOBBY_CREATED") {
          client.subscribe({
            destination: "/topic/lobby/:id",
            id: message.body.payload.id,
            onMessage: handleLobbyConnect,
          });
        }
      };

      client.publish({ destination: "/app/lobby/create/private" });
    } else {
      if (lobbyId === undefined)
        throw new InvalidStateError(
          "Lobby ID must be provided to join a lobby",
        );

      handleReply = (message) => {
        if (message.body.type === "LOBBY_JOINED") {
          client.subscribe({
            destination: "/topic/lobby/:id",
            id: message.body.payload.id,
            onMessage: handleLobbyConnect,
          });
        }
      };

      client.publish({
        destination: "/app/lobby/join/private/:id",
        id: urlLobbyId,
      });
    }

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
  }, [client, wsConnected]);

  return { connected, error, lobbyId, username: user!.username };
}
