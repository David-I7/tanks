import H1 from "../../components/headings/H1";
import { LobbyChat } from "./LobbyChat";
import Loader from "../../components/misc/Loader";
import Button from "../../components/buttons/Button";
import usePrivateLobby from "./usePrivateLobby";
import { useNavigate } from "react-router-dom";
import useClipboard from "../../hooks/useClipboard.ts";
import { useScreenStack } from "../../context/ScreenStack.tsx";
import InvalidStateError from "../../errors/InvalidStateError.ts";
import Surface from "../../components/layouts/Surface.tsx";
import Separator from "../../components/misc/Separator.tsx";
import TankSelector from "../../components/game/TankSelector.tsx";
import { useState } from "react";

export default function PrivateLobbyRoom() {
  const {
    isOnLobbyPage,
    state,
    username,
    isHost,
    shareLink,
    canStartGame,
    startGame,
    id,
    error,
    retry,
    leaveLobby,
    needsTankSelection,
    confirmTankSelection,
    selectedTankId,
  } = usePrivateLobby();
  const { copied, copyText } = useClipboard();
  const [modalTankId, setModalTankId] = useState(selectedTankId);

  if (needsTankSelection) {
    return (
      <Surface className="px-8 py-8 w-full max-w-md flex flex-col gap-6 text-center z-20">
        <H1 className="text-xl text-center">Join Private Room</H1>
        <p className="text-sm text-text-body-muted">
          Select your tank before entering the room lobby.
        </p>

        <TankSelector
          selectedTankId={modalTankId}
          onSelectTank={setModalTankId}
          label="Your Tank Identity"
        />

        <Button
          color="primary"
          onClick={() => confirmTankSelection(modalTankId)}
          className="w-full font-black text-sm tracking-widest mt-2"
        >
          Confirm & Join Room
        </Button>
      </Surface>
    );
  }

  if (state === "waiting_for_players" || state === "ready_to_start") {
    return (
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl relative z-10">
        {/* Left Panel: Lobby Settings & Actions */}
        <Surface className="p-6 md:p-8 flex-1 flex flex-col gap-6 justify-between min-h-[380px]">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] text-text-body-low uppercase tracking-widest font-black mb-1">
                HOST
              </div>
              <H1 className="text-xl md:text-3xl text-left">{username}</H1>
            </div>

            <Separator />

            {isHost && (
              <div>
                <div className="text-[10px] text-text-body/60 uppercase tracking-widest font-black mb-1">
                  SHARE INVITE LINK
                </div>

                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareLink ?? ""}
                    className="flex-1 bg-background/50 border border-border-main rounded-lg px-3 py-2 text-xs text-text-body-high outline-none select-all"
                  />
                  <Button
                    onClick={() => shareLink && copyText(shareLink)}
                    color={copied ? "success" : "secondary"}
                    variant="outline"
                    className="min-h-9 px-4 text-xs font-black select-none"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {isHost && (
              <Button
                disabled={!canStartGame}
                color="primary"
                onClick={() => startGame()}
                className="w-full font-black text-sm tracking-widest"
              >
                Start Game
              </Button>
            )}
            {isOnLobbyPage && <LeaveJoinedLobby onLeave={leaveLobby} />}
            {!isOnLobbyPage && <LeaveCreatedLobby onLeave={leaveLobby} />}
          </div>
        </Surface>

        {/* Right Panel: Lobby Chat (Embedded Widget) */}
        <div className="w-full md:w-[420px] flex">
          <LobbyChat lobbyId={id!} />
        </div>
      </div>
    );
  }
  if (state === "connecting_to_lobby" || state === "creating_game") {
    return (
      <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-4 text-center">
        <H1 className="text-xl animate-pulse text-center">
          {state === "connecting_to_lobby" && "Connecting to lobby..."}
          {state === "creating_game" && "Creating game..."}
        </H1>
        <Loader />
      </Surface>
    );
  } else if (state === "error") {
    return (
      <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-6 text-center">
        <H1 className="text-xl text-error text-center font-bold uppercase">
          Unexpected Error
        </H1>

        <div className="text-sm text-text-body/80">{error?.message}</div>

        <Button color="secondary" variant="outline" onClick={() => retry()}>
          Retry
        </Button>
      </Surface>
    );
  }

  throw new InvalidStateError("Illegal state");
}

function LeaveCreatedLobby({ onLeave }: { onLeave: () => void }) {
  const { popScreen } = useScreenStack();
  return (
    <Button
      color="secondary"
      variant="outline"
      onClick={() => {
        onLeave?.();
        popScreen();
      }}
      className="w-full text-xs font-black select-none"
    >
      Leave Room
    </Button>
  );
}

function LeaveJoinedLobby({ onLeave }: { onLeave: () => void }) {
  const navigate = useNavigate();
  return (
    <Button
      color="secondary"
      variant="outline"
      onClick={() => {
        onLeave?.();
        navigate("/", { replace: true });
      }}
      className="w-full text-xs font-black select-none"
    >
      Leave Room
    </Button>
  );
}
