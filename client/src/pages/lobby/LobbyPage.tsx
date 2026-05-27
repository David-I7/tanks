import { useLocation, useParams } from "react-router-dom";
import H1 from "../../components/headings/H1";
import { useAuth } from "../../context/AuthContext";
import { LobbyChat } from "./LobbyChat";
import { useFetch } from "../../hooks/useFetch";
import TanksClient from "../../api/http/TanksClient";
import JoinPrivateLobbyRequest from "../../api/http/requests/lobby/JoinPrivateLobbyRequest";
import { useCallback } from "react";
import Loader from "../../components/misc/Loader";

function joinPrivateLobby(id: string) {
  return new TanksClient().send(new JoinPrivateLobbyRequest(id));
}

export default function LobbyPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const { state } = useLocation();

  if (id === undefined) throw new Error("Lobby id is not present in the url");

  const cachedJoinPrivateLobby = useCallback(() => {
    return joinPrivateLobby(id);
  }, [id]);

  const enabled = state === null;

  const { data, loading, error } = useFetch(cachedJoinPrivateLobby, enabled);

  console.log(loading, state, data, enabled, error);
  if (!loading && error === null && data?.id !== null) {
    return (
      <div className="flex">
        <div>
          <H1>Welcome {user!.username}!</H1>
          <div>Lobby id: {id}</div>
          <div>
            Share Link: <br />
            {import.meta.env.VITE_BASE_API_URL}/lobby/{id}
          </div>
        </div>
        <LobbyChat />
      </div>
    );
  } else if (loading) {
    <div>
      <H1>LOADING...</H1>
      <Loader />
    </div>;
  } else if (error) {
    throw error;
  } else if (data?.id === null) {
    throw new Error("The provided lobby id is invalid");
  }
}
