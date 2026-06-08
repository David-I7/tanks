import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import H1 from "../../components/headings/H1";
import TanksWSClient from "../../api/ws/TanksWebSocketClient";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import { ApiError } from "../../errors/ApiError";
import { LobbyChat } from "./LobbyChat";
import Loader from "../../components/misc/Loader";
import UnexpectedError from "../../errors/UnexpectedError";
import Button from "../../components/buttons/Button";

type PrivateLobbyRoomProps = {
  action: "CREATE" | "JOIN";
};

export default function PrivateLobbyRoom({ action }: PrivateLobbyRoomProps) {
  const { user } = useAuth();
  const { id } = useParams();
  const client = useRef<TanksWSClient>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  if (action === "JOIN" && !uuidSchema.safeParse(id).success)
    throw new Error("Invalid lobby id");
  if (user === null) throw new Error("User is not logged in");

  useEffect(() => {
    const currentClient = new TanksWSClient();
    client.current = currentClient;

    currentClient.setOnConnect(() => {
      if (action === "CREATE") {
        currentClient.subscribe({
          destination: "/user/queue/replies",
          onMessage: (message) => {
            console.log(message.body);
            if (message.body.type === "LOBBY_CREATED") {
              currentClient.subscribe({
                destination: "/topic/lobby/:id",
                id: message.body.payload.id,
                onMessage: (message) => {
                  console.log(message.body);
                  if (message.body.type === "LOBBY_CONNECT") {
                    if (user.username === message.body.sender) {
                      setConnected(true);
                      setLobbyId(message.body.payload.id);
                    }
                  }
                },
              });
            }
          },
        });

        currentClient.subscribe<ProblemDetailDto>({
          destination: "/user/queue/errors",
          onMessage: (message) => {
            setError(new ApiError(message.body, message.body.status));
          },
        });

        currentClient.publish({ destination: "/app/lobby/create/private" });
      } else if (action === "JOIN") {
        currentClient.subscribe({
          destination: "/user/queue/replies",
          onMessage: (message) => {
            if (message.body.type === "LOBBY_JOINED") {
              currentClient.subscribe({
                destination: "/topic/lobby/:id",
                id: message.body.payload.id,
                onMessage: (message) => {
                  if (message.body.type === "LOBBY_CONNECT") {
                    if (user.username === message.body.sender) {
                      setConnected(true);
                      setLobbyId(message.body.payload.id);
                    }
                  }
                },
              });
            }
          },
        });

        currentClient.subscribe<ProblemDetailDto>({
          destination: "/user/queue/errors",
          onMessage: (message) => {
            setError(new ApiError(message.body, message.body.status));
          },
        });

        currentClient.publish({
          destination: "/app/lobby/join/private/:id",
          id,
        });
      }
    });

    client.current.onDisconnect(() => {
      console.log("DISCONNECTING...");
      setConnected(false);
    });

    currentClient.activate();
    return () => {
      currentClient.deactivate();
      console.log("UNMOUNTING...");
      setConnected(false);
    };
  }, []);

  useEffect(() => {
    console.log("CONNECTED STATUS: ", connected);
  }, [connected]);

  if (connected) {
    return (
      <div className="flex">
        <div>
          <H1>Welcome {user!.username}!</H1>
          <div>Lobby id: {lobbyId}</div>
          <div>
            Share Link: <br />
            http://localhost:5173/lobby/{lobbyId}
          </div>
          <Button color="primary">Start</Button>
        </div>
        <LobbyChat lobbyId={lobbyId!} />
      </div>
    );
  }

  if (error === null && !connected) {
    <div>
      <H1>LOADING...</H1>
      <Loader />
    </div>;
  } else if (error) {
    <div>
      <H1>THE LOBBY ID IS INVALID!!</H1>
      <Loader />
    </div>;
  } else {
    throw new UnexpectedError("Illegal state");
  }
}
