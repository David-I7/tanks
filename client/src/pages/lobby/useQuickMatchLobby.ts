import { useEffect, useState } from "react";
import { useWebSocket } from "../../context/WebSocketContext";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import { ApiError } from "../../errors/ApiError";
import type { EndpointSubscription } from "../../api/ws/TanksWebSocketClient";
import type { WebSocketEventResponseDto } from "../../api/ws/dto/WebSocketEventResponseDto";
import { useNavigate } from "react-router-dom";

export default function useQuickMatchLobby() {
  const { client, connected: wsConnected } = useWebSocket();
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!wsConnected) return;

    const handleLobbyMessage: EndpointSubscription<WebSocketEventResponseDto>["onMessage"] =
      (message) => {
        if (message.body.type === "LOBBY_CONNECT") {
          setPlayerCount((prev) => {
            const next = prev + 1;
            if (next === 2) {
              client.publish({ destination: "/app/game/create" });
            }
            return next;
          });
        }

        if (message.body.type === "LOBBY_DISCONNECT") {
          setPlayerCount(1);
        }
      };

    const handleReply: EndpointSubscription<WebSocketEventResponseDto>["onMessage"] =
      (message) => {
        if (
          message.body.type === "LOBBY_JOINED" ||
          message.body.type === "LOBBY_CREATED"
        ) {
          client.subscribe({
            destination: "/topic/lobby/:id",
            id: message.body.payload.id,
            onMessage: handleLobbyMessage,
          });
        }

        if (message.body.type === "GAME_CREATED") {
          navigate(`/game/${message.body.payload.id}`);
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

    client.publish({ destination: "/app/lobby/quick-match" });
  }, [client, wsConnected]);

  return { error, playerCount };
}
