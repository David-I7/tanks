import { useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import { useAuthStore } from "../../store/useAuthStore";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useEffect, useState } from "react";
import Loader from "../../components/misc/Loader";
import type { GameEvent } from "../../api/ws/dto/game/GameEventDto";
import type { OnlineDiffEnvelope } from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import {
  OnlineDiffSequenceError,
  applyOnlineStateDiff,
  initializeOnlineConfirmedState,
  initializeOnlineConfirmedStateFromResync,
  requestOnlineResyncState,
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

    const requestResync = () => {
      client.publish({
        destination: "/app/game/:id/resync",
        id,
      });
    };

    const handleGameplayDiff = (message: GameEvent | OnlineDiffEnvelope) => {
      if (message.type === "INITIAL_STATE") {
        setConfirmedState(initializeOnlineConfirmedState(message));
        return;
      }

      if (
        message.type === "RESYNC_STATE" ||
        message.type === "MOVEMENT_SEGMENT" ||
        message.type === "PROJECTILE_RESOLUTION" ||
        message.type === "TERRAIN_PATCH" ||
        message.type === "INTENT_REJECTION" ||
        message.type === "TURN_TRANSITION" ||
        message.type === "TERMINAL_GAME"
      ) {
        setConfirmedState((current) => {
          if (current === null) {
            return message.type === "RESYNC_STATE"
              ? initializeOnlineConfirmedStateFromResync(message)
              : current;
          }

          try {
            return applyOnlineStateDiff(current, message);
          } catch (error) {
            if (error instanceof OnlineDiffSequenceError && error.kind === "MISSING_DIFF") {
              requestResync();
              return requestOnlineResyncState(current);
            }

            throw error;
          }
        });
      }
    };

    client.subscribe<GameEvent | OnlineDiffEnvelope>({
      destination: "/user/queue/replies",
      onMessage: (message) => {
        handleGameplayDiff(message.body);
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

        handleGameplayDiff(message.body);
      }
    });

    requestResync();
  }, [client, status])


  return (
    <div>
      {connected ? <div>{confirmedState ? "Online game initialized" : "Connected"}</div> : <Loader />}
    </div>
  );
}

