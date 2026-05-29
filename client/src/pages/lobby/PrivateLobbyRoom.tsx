import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import H1 from "../../components/headings/H1";
import TanksWSClient from "../../api/ws/TanksWebSocketClient";
import type LobbyResponseDto from "../../api/ws/dto/lobby/LobbyResponseDto";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import { ApiError } from "../../errors/ApiError";
import { LobbyChat } from "./LobbyChat";
import Loader from "../../components/misc/Loader";
import UnexpectedError from "../../errors/UnexpectedError";

type PrivateLobbyRoomProps = {
  action: "CREATE" | "JOIN";
};

export default function PrivateLobbyRoom({ action }: PrivateLobbyRoomProps) {
  const { user } = useAuth();
  const { id } = useParams();
  const client = useRef<TanksWSClient>(null);
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
        currentClient.publish({ destination: "/app/lobby/create" });

        currentClient.subscribe<LobbyResponseDto>({
          destination: "/user/queue/replies",
          onMessage: (message) => {
            setLobbyId(message.body.id);
          },
        });

        currentClient.subscribe<ProblemDetailDto>({
          destination: "/user/queue/errors",
          onMessage: (message) => {
            setError(new ApiError(message.body, message.body.status));
          },
        });
      } else if (action === "JOIN") {
        currentClient.publish({ destination: "/app/lobby/join/:id", id });

        currentClient.subscribe<LobbyResponseDto>({
          destination: "/user/queue/replies",
          onMessage: (message) => {
            setLobbyId(message.body.id);
          },
        });

        currentClient.subscribe<ProblemDetailDto>({
          destination: "/user/queue/errors",
          onMessage: (message) => {
            setError(new ApiError(message.body, message.body.status));
          },
        });
      }
    });

    currentClient.activate();
    return () => {
      currentClient.deactivate();
    };
  }, []);

  if (lobbyId !== null) {
    return (
      <div className="flex">
        <div>
          <H1>Welcome {user!.username}!</H1>
          <div>Lobby id: {lobbyId}</div>
          <div>
            Share Link: <br />
            {import.meta.env.VITE_BASE_API_URL}/lobby/{lobbyId}
          </div>
        </div>
        <LobbyChat lobbyId={lobbyId} />
      </div>
    );
  }

  if (error === null && lobbyId === null) {
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
