import { useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import { useAuthStore } from "../../store/useAuthStore";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import type { SubscriptionCleanup } from "../../api/ws/TanksWebSocketClient";
import { useEffect, useRef, useState } from "react";
import Loader from "../../components/misc/Loader";

export default function GamePage() {
  const { id } = useParams();

  if (!uuidSchema.safeParse(id).success) throw new Error("Invalid game id");

  return (
    <GameView />
  );
}

function GameView() {
  const { id } = useParams();
  const { client, connected: wsConnected, connect } = useWebSocketStore();
  const user = useAuthStore(state => state.user);
  const subscriptions = useRef<SubscriptionCleanup[]>([]);
  const [connected, setConnected] = useState<boolean>(false);


  useEffect(() => {
    if (!client) {
      connect();
      return;
    }

    if (!wsConnected) return;

    subscriptions.current.push(
      client.subscribe({
        destination: "/topic/game/:id",
        id,
        onMessage: (message) => {
          if (message.body.type === "GAME_CONNECT") {
            if (message.body.payload.playerName === user.username)
              setConnected(true);
          }
        }
      })
    );
  }, [client, wsConnected])


  return (
    <div>
      {connected ? <div>Connected</div> : <Loader />}
    </div>
  );
}

