import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import Loader from "../../components/misc/Loader";
import useQuickMatchLobby from "./useQuickMatchLobby";
import Surface from "../../components/layouts/Surface";

export default function QuickMatchLobbyRoom() {
  const { playerCount, leaveLobby, state, error, retryLobbyJoin } =
    useQuickMatchLobby();

  if (error) {
    return (
      <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-6 text-center">
        <H1 className="text-center py-2 text-xl md:text-2xl animate-pulse">
          Error
        </H1>
        <div>{error.message}</div>
        <Button color="secondary" variant="outline" onClick={leaveLobby}>
          Cancel
        </Button>
        <Button color="primary" variant="outline" onClick={retryLobbyJoin}>
          Retry
        </Button>
      </Surface>
    );
  }

  return (
    <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-6 text-center">
      <H1 className="text-center py-2 text-xl md:text-2xl animate-pulse">
        {state === "connecting_to_lobby" && "Connecting to lobby..."}
        {state === "searching_for_players" && "Searching for players..."}
        {state === "creating_game" && "Creating game..."}
      </H1>

      <div className="py-4 flex justify-center">
        <Loader className="w-10 h-10" />
      </div>

      <div> Players: {playerCount}/2</div>

      <div className="text-xs text-text-body/60 uppercase tracking-wider animate-pulse mb-2">
        Searching for a game...
      </div>

      <Button color="secondary" variant="outline" onClick={leaveLobby}>
        Cancel
      </Button>
    </Surface>
  );
}
