import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "@/components/buttons/Button";
import TankSelector from "@/components/game/TankSelector";
import H1 from "@/components/headings/H1";
import Surface from "@/components/layouts/Surface";
import Loader from "@/components/misc/Loader";
import Separator from "@/components/misc/Separator";
import { useScreenStack } from "@/context/ScreenStack";
import useClipboard from "@/hooks/useClipboard";
import { GameView } from "@/pages/game/GamePage";
import type { HomeScreenStack } from "@/pages/home/HomePage";
import { usePlayerStore } from "@/store/usePlayerStore";
import { LobbyChat } from "./LobbyChat";
import useLobbyChat from "./chat/useLobbyChat";
import usePrivateLobby from "./usePrivateLobby";

type PrivateLobbyScreenState = {
  lobbyId?: string;
} | null;

export default function PrivateLobbyRoom() {
  const { state: screenState, popScreen } = useScreenStack<HomeScreenStack>();
  const [searchParams, setSearchParams] = useSearchParams();
  const player = usePlayerStore((s) => s.player);

  const joinLobbyId =
    (screenState as PrivateLobbyScreenState)?.lobbyId ?? null;

  const [readyToJoin, setReadyToJoin] = useState(
    () =>
      joinLobbyId === null ||
      (player.nickname.trim().length > 0 && player.tankId.length > 0),
  );

  const handleCancelPreJoin = () => {
    if (searchParams.has("lobbyId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("lobbyId");
      setSearchParams(next, { replace: true });
    }
    popScreen();
  };

  if (!readyToJoin) {
    return (
      <PreJoinSetup
        onReady={() => setReadyToJoin(true)}
        onCancel={handleCancelPreJoin}
      />
    );
  }

  return <ConnectedPrivateLobby joinLobbyId={joinLobbyId} />;
}

function PreJoinSetup({
  onReady,
  onCancel,
}: {
  onReady: () => void;
  onCancel: () => void;
}) {
  const player = usePlayerStore((s) => s.player);
  const setNickname = usePlayerStore((s) => s.setNickname);
  const canJoin = player.nickname.trim().length > 0 && player.tankId.length > 0;

  return (
    <Surface className="px-8 py-8 w-full max-w-md flex flex-col gap-5 text-center relative z-10">
      <H1 className="text-xl text-center mb-1">Join Private Room</H1>
      <p className="text-xs text-text-body-muted">
        Pick a nickname and tank before entering the room.
      </p>

      <div className="flex flex-col gap-1.5 text-left">
        <label
          htmlFor="join-nickname"
          className="text-xs font-semibold uppercase tracking-wider text-text-body-muted"
        >
          Nickname
        </label>
        <input
          id="join-nickname"
          type="text"
          value={player.nickname}
          maxLength={20}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter nickname..."
          className="w-full px-3 py-2 bg-background/50 border border-border-main rounded-lg text-sm text-text-body-high focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <TankSelector label="Select Your Tank" />

      <div className="flex flex-col gap-2 mt-2">
        <Button color="primary" disabled={!canJoin} onClick={onReady}>
          Join Room
        </Button>
        <Button color="secondary" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Surface>
  );
}

function ConnectedPrivateLobby({
  joinLobbyId,
}: {
  joinLobbyId: string | null;
}) {
  const {
    state,
    lobbyId,
    username,
    isHost,
    shareLink,
    canStartGame,
    startGame,
    returnToLobby,
    retry,
    leaveLobby,
  } = usePrivateLobby(joinLobbyId);
  const chat = useLobbyChat(lobbyId);
  const { copied, copyText } = useClipboard();

  switch (state.status) {
    case "IN_GAME":
      return (
        <GameView
          gameSessionId={state.gameSessionId}
          onReturnToLobby={returnToLobby}
          onLeaveLobby={leaveLobby}
        />
      );

    case "CONNECTING_TO_LOBBY":
    case "CREATING_GAME":
      return (
        <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-4 text-center">
          <H1 className="text-xl animate-pulse text-center">
            {state.status === "CONNECTING_TO_LOBBY"
              ? "Connecting to lobby..."
              : "Creating game..."}
          </H1>
          <Loader />
        </Surface>
      );

    case "DISCONNECTED":
      return (
        <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-6 text-center">
          <H1 className="text-xl text-error text-center font-bold uppercase">
            {state.error ? "Unexpected Error" : "Disconnected"}
          </H1>

          <div className="text-sm text-text-body/80">
            {state.error?.message ?? "Disconnected from lobby."}
          </div>

          <div className="flex flex-col gap-2">
            <Button color="primary" variant="outline" onClick={retry}>
              Retry
            </Button>
            <Button color="secondary" variant="outline" onClick={leaveLobby}>
              Leave Room
            </Button>
          </div>
        </Surface>
      );

    case "WAITING_FOR_PLAYERS":
    case "READY_TO_START":
      return (
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl relative z-10">
          <Surface className="p-6 md:p-8 flex-1 flex flex-col gap-6 justify-between min-h-[380px]">
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-[10px] text-text-body-low uppercase tracking-widest font-black mb-1">
                  {isHost ? "HOST" : "PLAYER"}
                </div>
                <H1 className="text-xl md:text-3xl text-left">{username}</H1>
                <div className="text-xs text-text-body-muted mt-1">
                  {state.status === "READY_TO_START"
                    ? "Players ready (2/2)"
                    : "Waiting for opponent (1/2)..."}
                </div>
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
                  onClick={startGame}
                  className="w-full font-black text-sm tracking-widest"
                >
                  Start Game
                </Button>
              )}
              <Button
                color="secondary"
                variant="outline"
                onClick={leaveLobby}
                className="w-full text-xs font-black select-none"
              >
                Leave Room
              </Button>
            </div>
          </Surface>

          <div className="w-full md:w-[420px] flex">
            <LobbyChat chat={chat} />
          </div>
        </div>
      );
  }
}
