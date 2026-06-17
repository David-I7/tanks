import { useEffect } from "react";
import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import Loader from "../../components/misc/Loader";
import { useScreenStack } from "../../context/ScreenStack";
import useQuickMatchLobby from "./useQuickMatchLobby";

export default function QuickMatchLobbyRoom() {
  const { popScreen } = useScreenStack();
  const {} = useQuickMatchLobby();

  useEffect(() => {}, []);

  return (
    <div className="cyber-panel px-8 py-8 w-full max-w-sm flex flex-col gap-6 text-center">
      <H1 className="text-center py-2 text-xl md:text-2xl animate-pulse">Searching...</H1>

      <div className="py-4 flex justify-center">
        <Loader className="w-10 h-10" />
      </div>

      <div className="text-xs text-text-body/60 font-body uppercase tracking-wider animate-pulse mb-2">
        Searching for a game...
      </div>

      <Button
        color="secondary"
        variant="outline"
        onClick={() => {
          popScreen();
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
