import H1 from "../../components/headings/H1";
import { LobbyChat } from "./LobbyChat";
import Loader from "../../components/misc/Loader";
import UnexpectedError from "../../errors/UnexpectedError";
import Button from "../../components/buttons/Button";
import usePrivateLobby from "./usePrivateLobby";
import {useNavigate} from "react-router-dom";
import {useScreenStack} from "../../context/ScreenStack.tsx";

export default function PrivateLobbyRoom() {
  const { connected, error, lobbyId, username,canStartGame,createGame, action } = usePrivateLobby();
  
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
            {action === "JOIN" && <LeaveJoinedLobby/>}
            {action === "CREATE" && <LeaveCreatedLobby/>}
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

function LeaveCreatedLobby(){
  const {popScreen} = useScreenStack()

  return <Button color="secondary" onClick={() => {popScreen()}
  }>Leave</Button>
}

function LeaveJoinedLobby(){
  const navigate = useNavigate()
  return <Button color="secondary" onClick={() =>navigate("/",{replace:true})}>Leave</Button>
}
