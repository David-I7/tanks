import H1 from "../../components/headings/H1";
import { LobbyChat } from "./LobbyChat";
import Loader from "../../components/misc/Loader";
import UnexpectedError from "../../errors/UnexpectedError";
import Button from "../../components/buttons/Button";
import usePrivateLobby from "./usePrivateLobby";

export default function PrivateLobbyRoom() {
  const { connected, error, lobbyId, username, disconnect,canStartGame,createGame } = usePrivateLobby();

  if (connected) {
    return (
      <div className="flex">
        <div>
          <H1>Welcome {username}!</H1>
          <div>Lobby id: {lobbyId}</div>
          <div>
            Share Link: <br />
            http://localhost:5173/lobby/{lobbyId}
          </div>
          <Button disabled={!canStartGame} color="primary" onClick={() => createGame()}>Start</Button>
          <Button color="secondary" onClick={() => disconnect()}>Leave</Button>
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
