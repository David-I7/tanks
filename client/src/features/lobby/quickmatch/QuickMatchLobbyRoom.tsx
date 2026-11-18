import Button from "@/components/buttons/Button";
import H1 from "@/components/headings/H1";
import Surface from "@/components/layouts/Surface";
import Loader from "@/components/misc/Loader";
import { GameView } from "@/pages/game/GamePage";
import useQuickMatchLobby from "./useQuickMatchLobby";

export default function QuickMatchLobbyRoom() {
  const {
    state,
    playerCount,
    startGame,
    returnToLobby,
    leaveLobby,
    retry,
  } = useQuickMatchLobby();

  switch (state.status) {
    case "IN_GAME":
      return (
        <GameView
          gameSessionId={state.gameSessionId}
          onReturnToLobby={returnToLobby}
          onLeaveLobby={leaveLobby}
        />
      );

    case "DISCONNECTED":
      return (
        <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-6 text-center">
          <H1 className="text-center py-2 text-xl md:text-2xl">
            {state.error ? "Error" : "Disconnected"}
          </H1>
          <div>{state.error?.message ?? "Disconnected from quick match."}</div>
          <Button color="primary" variant="outline" onClick={retry}>
            Retry
          </Button>
          <Button color="secondary" variant="outline" onClick={leaveLobby}>
            Cancel
          </Button>
        </Surface>
      );

    case "READY_TO_START":
      return (
        <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-6 text-center">
          <H1 className="text-center py-2 text-xl md:text-2xl">
            Rematch Ready
          </H1>
          <div>Players: {playerCount}/2</div>
          <Button color="primary" onClick={startGame}>
            Start Rematch
          </Button>
          <Button color="secondary" variant="outline" onClick={leaveLobby}>
            Leave
          </Button>
        </Surface>
      );

    case "CONNECTING_TO_LOBBY":
    case "WAITING_FOR_PLAYERS":
    case "CREATING_GAME":
      return (
        <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-6 text-center">
          <H1 className="text-center py-2 text-xl md:text-2xl animate-pulse">
            {state.status === "CONNECTING_TO_LOBBY" && "Connecting to lobby..."}
            {state.status === "WAITING_FOR_PLAYERS" &&
              "Searching for players..."}
            {state.status === "CREATING_GAME" && "Creating game..."}
          </H1>

          <div className="py-4 flex justify-center">
            <Loader className="w-10 h-10" />
          </div>

          <div>Players: {playerCount}/2</div>

          <Button color="secondary" variant="outline" onClick={leaveLobby}>
            Cancel
          </Button>
        </Surface>
      );
  }
}
