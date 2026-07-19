import { ArrowLeft } from "lucide-react";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import H1 from "../../components/headings/H1";
import Surface from "../../components/layouts/Surface";
import TankSelector from "../../components/game/TankSelector";
import { useScreenStack } from "../../context/ScreenStack";
import { useAssetStore } from "../../store/useAssetStore";
import type { HomeScreenStack } from "./HomePage";

export default function OnlineMenu() {
  const { popScreen, pushScreen } = useScreenStack<HomeScreenStack>();
  const selectedTankId = useAssetStore((state) => state.selectedTankId);
  const setSelectedTankId = useAssetStore((state) => state.setSelectedTankId);

  return (
    <Surface className="px-8 py-8 w-full max-w-md flex flex-col gap-5 text-center relative pt-14">
      <div className="absolute top-4 left-4">
        <IconButton
          onClick={() => popScreen()}
          icon={<ArrowLeft size={16} />}
        />
      </div>
      <H1 className="text-center mb-1">Online Mode</H1>

      <TankSelector
        selectedTankId={selectedTankId}
        onSelectTank={setSelectedTankId}
        label="Select Your Tank"
      />

      <div className="flex flex-col gap-3 mt-2">
        <Button color="primary" onClick={() => pushScreen("quickMatchLobby")}>
          Play Quick Match
        </Button>
        <Button color="secondary" onClick={() => pushScreen("privateLobby")}>
          Create Private Room
        </Button>
      </div>
    </Surface>
  );
}
