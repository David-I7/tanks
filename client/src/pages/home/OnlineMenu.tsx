import { ArrowLeft } from "lucide-react";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import H1 from "../../components/headings/H1";
import Surface from "../../components/layouts/Surface";
import TankSelector from "../../components/game/TankSelector";
import { useScreenStack } from "../../context/ScreenStack";
import type { HomeScreenStack } from "./HomePage";
import { useUserStatusQuery } from "../../hooks/useUserStatusQuery";
import UiError from "../../errors/UiError";

export default function OnlineMenu() {
  const { popScreen, pushScreen } = useScreenStack<HomeScreenStack>();
  const checked = useCheckUserStatus();

  if (checked === false) {
    return null;
  }

  return (
    <Surface className="px-8 py-8 w-full max-w-md flex flex-col gap-5 text-center relative pt-14">
      <div className="absolute top-4 left-4">
        <IconButton
          onClick={() => popScreen()}
          icon={<ArrowLeft size={16} />}
        />
      </div>
      <H1 className="text-center mb-1">Online Mode</H1>

      <TankSelector label="Select Your Tank" />

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

function useCheckUserStatus() {
  const { data: userStatus, isFetching } = useUserStatusQuery();

  if (isFetching) {
    return false;
  }

  if (userStatus == null) return true;

  if (userStatus.state === "IN_LOBBY") {
    throw new UiError({
      description: "You are currently in a lobby in another tab or window.",
      heading: "In a lobby",
    });
  }

  return true;
}
