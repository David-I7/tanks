import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import { useScreenStack } from "../../context/ScreenStack";
import type { HomeScreenStack } from "./HomePage";

export default function RootScreen() {
  const { pushScreen } = useScreenStack<HomeScreenStack>();

  return (
    <section className="flex flex-col gap-3 text-center w-full max-w-sm">
      <H1 className="text-center py-2">Tanks!</H1>
      <p className="text-xs text-text-body-muted -mt-2 mb-3">
        Choose your game mode to get started
      </p>
      <Button onClick={() => pushScreen("offlineMenu")} color="secondary">
        Offline Game
      </Button>
      <Button onClick={() => pushScreen("onlineMenu")} color="primary">
        Online Game
      </Button>
    </section>
  );
}
