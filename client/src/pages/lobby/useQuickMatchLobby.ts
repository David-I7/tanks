import { useEffect, useRef, useState } from "react";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import { ApiError } from "../../errors/ApiError";
import type { EndpointSubscription, SubscriptionCleanup } from "../../api/ws/TanksWebSocketClient";
import type { WebSocketEventResponseDto } from "../../api/ws/dto/WebSocketEventResponseDto";
import { useNavigate } from "react-router-dom";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useAuthStore } from "../../store/useAuthStore";

export default function useQuickMatchLobby() {
  const { client, connected: wsConnected } = useWebSocketStore();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);
  const subscriptions = useRef<SubscriptionCleanup[]>([]);
  const [isHost, setIsHost] = useState<boolean>(false);

  useEffect(() => {
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
          subscriptions.current.push(client.subscribe({
            destination: "/topic/lobby/:id",
            id: message.body.payload.id,
            onMessage: handleLobbyMessage,
          }));
        }

        if (message.body.type === "GAME_CREATED") {
          navigate(`/game/${message.body.payload.id}`);
        }
      };

    subscriptions.current.push(client.subscribe({
      destination: "/user/queue/replies",
      onMessage: handleReply,
    }));

    subscriptions.current.push(client.subscribe<ProblemDetailDto>({
      destination: "/user/queue/errors",
      onMessage: (message) => {
        setError(new ApiError(message.body, message.body.status));
      },
    }));

    client.publish({ destination: "/app/lobby/quick-match" });
  }, [client, wsConnected]);

  useEffect(() => {
    return () => {
      subscriptions.current.forEach(cleanup => cleanup());
      subscriptions.current = [];
    }
  }, [client]);

  return { error, playerCount };
}
