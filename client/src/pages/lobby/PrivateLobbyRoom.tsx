import H1 from "../../components/headings/H1";
import { LobbyChat } from "./LobbyChat";
import Loader from "../../components/misc/Loader";
import Button from "../../components/buttons/Button";
import usePrivateLobby from "./usePrivateLobby";
import { useNavigate } from "react-router-dom";
import useClipboard from "../../hooks/useClipboard.ts";
import { useScreenStack } from "../../context/ScreenStack.tsx";
import InvalidStateError from "../../errors/InvalidStateError.ts";

export default function PrivateLobbyRoom() {
  const { lobbyStatus, error, username, createGame, canStartGame, isHost, hostShareLink, lobbyId, action } = usePrivateLobby();

  const { copied, copyText } = useClipboard();

  if (lobbyStatus === "connected") {
    return (
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl relative z-10">
        {/* Left Panel: Lobby Settings & Actions */}
        <div className="cyber-panel p-6 md:p-8 flex-1 flex flex-col gap-6 justify-between min-h-[380px]">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] text-accent uppercase tracking-widest font-black mb-1">HOST</div>
              <H1 className="text-xl md:text-3xl text-neon-yellow text-left">{username}</H1>
            </div>

            <div className="h-[1px] bg-accent/20"></div>


            {isHost &&
              <div>
                <div className="text-[10px] text-text-body/60 uppercase tracking-widest font-black mb-1">SHARE INVITE LINK</div>

                <div className="flex gap-2">
                  <input
                    readOnly
                    value={hostShareLink ?? ""}
                    className="flex-1 bg-background/50 border border-accent/25 px-3 py-2 text-xs text-text-body-high outline-none font-body select-all"
                  />
                  <Button
                    onClick={() => hostShareLink && copyText(hostShareLink)}
                    color={copied ? "success" : "secondary"}
                    variant="outline"
                    className="min-h-9 px-4 text-xs font-black select-none"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            }
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {isHost &&
              <Button
                disabled={!canStartGame}
                color="primary"
                onClick={() => createGame()}
                className="w-full font-black text-sm tracking-widest"
              >
                Start Game
              </Button>
            }
            {action === "JOIN" && <LeaveJoinedLobby />}
            {action === "CREATE" && <LeaveCreatedLobby />}
          </div>
        </div>

        {/* Right Panel: Lobby Chat (Embedded Widget) */}
        <div className="w-full md:w-[420px] flex">
          <LobbyChat lobbyId={lobbyId!} />
        </div>
      </div>
    );
  }
  if (error === null && lobbyStatus === "connecting") {
    return (
      <div className="cyber-panel px-8 py-8 w-full max-w-sm flex flex-col gap-4 text-center">
        <H1 className="text-xl animate-pulse text-center">Loading...</H1>
        <Loader />
      </div>
    );
  } else if (error) {
    console.error(error);
    return (
      <div className="cyber-panel px-8 py-8 w-full max-w-sm flex flex-col gap-6 text-center">
        <H1 className="text-xl text-error text-center font-bold uppercase">Lobby Not Found</H1>
        <div className="text-sm font-body text-text-body/80">
          The lobby code provided does not exist or has expired.
        </div>
        <LeaveJoinedLobby />
      </div>
    );
  } else if (lobbyStatus === "disconnected" || lobbyStatus === "disconnecting") {
    console.log("Lobby disconnected", lobbyStatus);
    return (
      <div className="cyber-panel px-8 py-8 w-full max-w-sm flex flex-col gap-6 text-center">
        <H1 className="text-xl text-error text-center font-bold uppercase">You've Disconnected!</H1>
        <div className="text-sm font-body text-text-body/80">
          The host has ended the lobby.
        </div>
        <LeaveJoinedLobby />
      </div>
    );
  } else {
    throw new InvalidStateError("Illegal state");
  }
}

function LeaveCreatedLobby() {
  const { popScreen } = useScreenStack();

  return (
    <Button
      color="secondary"
      variant="outline"
      onClick={() => popScreen()}
      className="w-full text-xs font-black select-none"
    >
      Leave Room
    </Button>
  );
}

function LeaveJoinedLobby() {
  const navigate = useNavigate();
  return (
    <Button
      color="secondary"
      variant="outline"
      onClick={() => navigate("/", { replace: true })}
      className="w-full text-xs font-black select-none"
    >
      Leave Room
    </Button>
  );
}
