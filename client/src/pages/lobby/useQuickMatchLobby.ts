import { useEffect, useState } from "react";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import { ApiError } from "../../errors/ApiError";
import type { EndpointSubscription, } from "../../api/ws/TanksWebSocketClient";
import type { WebSocketEventResponseDto } from "../../api/ws/dto/WebSocketEventResponseDto";
import { useNavigate } from "react-router-dom";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useAuthStore } from "../../store/useAuthStore";
import type { LobbyEventPayload } from "../../api/ws/dto/lobby/LobbyEventDto";
import { useScreenStack } from "../../context/ScreenStack";

export default function useQuickMatchLobby() {
  const { client, status, connect } = useWebSocketStore();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);
  const { popScreen } = useScreenStack();

  useEffect(() => {
    if (!client) {
      connect();
      return;
    }

    if (status !== "connected") return;

    const handleLobbyMessage: EndpointSubscription<WebSocketEventResponseDto>["onMessage"] =
      (message) => {
        if (message.body.type === "LOBBY_CONNECT") {
          setPlayerCount(prev => {
            const next = prev + 1;
            if ((message.body.payload as LobbyEventPayload).playerName !== user?.username && next === 2) {
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
          client.clearSubscriptions();
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
  }, [client, status]);

  useEffect(() => {
    if (status === "disconnecting" || status === "disconnected") {
      popScreen();
    }
  }, [status]);

  return { error, playerCount };
}
