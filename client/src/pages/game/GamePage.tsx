import { useNavigate, useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import { useAuthStore } from "../../store/useAuthStore";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useEffect, useState } from "react";
import Loader from "../../components/misc/Loader";
import type { GameEvent } from "../../api/ws/dto/game/GameEventDto";
import { createOnlineGameplayTransport } from "../../game/online/OnlineGameplayTransport";
import { createOnlineGameplayAuthority } from "../../game/online/OnlineGameplayAuthority";
import type { OnlineConfirmedState } from "../../game/online/onlineConfirmedState";

export default function GamePage() {
  const { id } = useParams();

  if (typeof id !== "string" || !uuidSchema.safeParse(id).success) {
    throw new Error("Invalid game id");
  }

  return <GameView gameSessionId={id} />;
}

function GameView({ gameSessionId }: { gameSessionId: string }) {
  const navigate = useNavigate();
  const { client, status, connect } = useWebSocketStore();
  const user = useAuthStore(state => state.user);
  const getAuthStatus = useAuthStore(state => state.getAuthStatus);
  const [connected, setConnected] = useState<boolean>(false);
  const [confirmedState, setConfirmedState] = useState<OnlineConfirmedState | null>(null);


  useEffect(() => {
    if (client === null) {
      connect();
      return;
    }

    if (status !== "connected") return;

    let cancelled = false;
    let errorsCleanup: (() => void) | undefined;
    let gameTopicCleanup: (() => void) | undefined;
    const gameplayTransport = createOnlineGameplayTransport({
      client,
      gameSessionId,
    });
    const gameplayAuthority = createOnlineGameplayAuthority({
      transport: gameplayTransport,
    });

    errorsCleanup = client.subscribe<GameEvent>({
      destination: "/user/queue/errors",
      onMessage: (message) => {
        console.error("Error:", message.body);
      }
    })

    const gameplayCleanup = gameplayAuthority.subscribe(setConfirmedState);

    void (async () => {
      const authStatus = await getAuthStatus();
      if (cancelled) return;

      if (authStatus?.userSessionStatus?.state !== "IN_GAME" || authStatus.userSessionStatus.gameId !== gameSessionId) {
        navigate("/", { replace: true });
        return;
      }

      gameTopicCleanup = gameplayTransport.subscribeToGameEvents(
        (event: GameEvent) => {
          if (event.type === "GAME_CONNECT" && event.payload.playerName === user?.username) {
            setConnected(true);
          }

          if (event.type === "GAME_STARTED") {
            console.log("Game started:", event.payload);
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      errorsCleanup?.();
      gameplayCleanup();
      gameplayAuthority.destroy();
      gameplayTransport.destroy();
      gameTopicCleanup?.();
    };
  }, [client, gameSessionId, getAuthStatus, navigate, status, user?.username])


  return (
    <div>
      {connected ? <div>{confirmedState ? "Online game initialized" : "Connected"}</div> : <Loader />}
    </div>
  );
}

