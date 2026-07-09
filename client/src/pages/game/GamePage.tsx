import { useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import { useAuthStore } from "../../store/useAuthStore";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useEffect, useState } from "react";
import Loader from "../../components/misc/Loader";
import type { GameEvent } from "../../api/ws/dto/game/GameEventDto";
import type { OnlineDiffEnvelope } from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  initializeOnlineConfirmedState,
  type OnlineConfirmedState,
} from "../../game/online/onlineConfirmedState";

export default function GamePage() {
  const { id } = useParams();

  if (!uuidSchema.safeParse(id).success) throw new Error("Invalid game id");

  return (
    <GameView />
  );
}

function GameView() {
  const { id } = useParams();
  const { client, status, connect } = useWebSocketStore();
  const user = useAuthStore(state => state.user);
  const [connected, setConnected] = useState<boolean>(false);
  const [confirmedState, setConfirmedState] = useState<OnlineConfirmedState | null>(null);


  useEffect(() => {
    if (client === null) {
      connect();
      return;
    }

    if (status !== "connected") return;

    client.subscribe<GameEvent>({
      destination: "/user/queue/errors",
      onMessage: (message) => {
        console.error("Error:", message.body);
      }
    })

    const handleInitialState = (message: GameEvent | OnlineDiffEnvelope) => {
      if (message.type === "INITIAL_STATE") {
        setConfirmedState(initializeOnlineConfirmedState(message));
      }
    };

    client.subscribe<GameEvent | OnlineDiffEnvelope>({
      destination: "/user/queue/replies",
      onMessage: (message) => {
        handleInitialState(message.body);
        console.log("Reply:", message.body);
      }
    })

    client.subscribe<GameEvent | OnlineDiffEnvelope>({
      destination: "/topic/game/:id",
      id,
      onMessage: (message) => {
        if (message.body.type === "GAME_CONNECT") {
          if (message.body.payload.playerName === user?.username)
            setConnected(true);
        }

        if (message.body.type === "GAME_STARTED") {
          console.log("Game started:", message.body.payload);
        }

        handleInitialState(message.body);
      }
    });
  }, [client, status])


  return (
    <div>
      {connected ? <div>{confirmedState ? "Online game initialized" : "Connected"}</div> : <Loader />}
    </div>
  );
}

