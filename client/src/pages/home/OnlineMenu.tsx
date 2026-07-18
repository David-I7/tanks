import { ArrowLeft, Loader } from "lucide-react";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import H1 from "../../components/headings/H1";
import Surface from "../../components/layouts/Surface";
import { useScreenStack } from "../../context/ScreenStack";
import type { HomeScreenStack } from "./HomePage";

export default function OnlineMenu() {
  const { popScreen, pushScreen } = useScreenStack<HomeScreenStack>();

  return (
    <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-5 text-center relative pt-14">
      <div className="absolute top-4 left-4">
        <IconButton
          onClick={() => popScreen()}
          icon={<ArrowLeft size={16} />}
        />
      </div>
      <H1 className="text-center mb-2">Online</H1>

      <Button color="primary" onClick={() => pushScreen("quickMatchLobby")}>
        Play Quick Match
      </Button>
      <Button color="secondary" onClick={() => pushScreen("privateLobby")}>
        Create Private Room
      </Button>
    </Surface>
  );
}
