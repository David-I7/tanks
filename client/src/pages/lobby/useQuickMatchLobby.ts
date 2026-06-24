import { useEffect, useRef, useState } from "react";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import { ApiError } from "../../errors/ApiError";
import type { EndpointSubscription, SubscriptionCleanup } from "../../api/ws/TanksWebSocketClient";
import type { WebSocketEventResponseDto } from "../../api/ws/dto/WebSocketEventResponseDto";
import { useNavigate } from "react-router-dom";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useAuthStore } from "../../store/useAuthStore";

export default function useQuickMatchLobby() {
  const { client, connected: wsConnected, connect } = useWebSocketStore();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const lobbyTopicSubscription = useRef<SubscriptionCleanup | null>(null);

  useEffect(() => {
    if (!client) {
      connect();
      return;
    }

    if (!wsConnected) return;

    const handleLobbyMessage: EndpointSubscription<WebSocketEventResponseDto>["onMessage"] =
      (message) => {
        if (message.body.type === "LOBBY_CONNECT") {
          setPlayerCount(prev => prev + 1);
          if (message.body.payload.playerName !== user.username && isHost) {
            client.publish({ destination: "/app/game/create" });
          }
        }

        if (message.body.type === "LOBBY_DISCONNECT") {
          setPlayerCount(1);
          setIsHost(true);
        }
      };

    const handleReply: EndpointSubscription<WebSocketEventResponseDto>["onMessage"] =
      (message) => {
        if (
          message.body.type === "LOBBY_JOINED" ||
          message.body.type === "LOBBY_CREATED"
        ) {
          setIsHost(message.body.type === "LOBBY_CREATED");
          lobbyTopicSubscription.current = client.subscribe({
            destination: "/topic/lobby/:id",
            id: message.body.payload.id,
            onMessage: handleLobbyMessage,
          });
        }

        if (message.body.type === "GAME_CREATED") {
          lobbyTopicSubscription.current?.();
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
