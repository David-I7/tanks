import { ArrowLeft } from "lucide-react";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import H1 from "../../components/headings/H1";
import TankSelector from "../../components/game/TankSelector";
import { useScreenStack } from "../../context/ScreenStack";
import type { HomeScreenStack } from "./HomePage";
import { usePlayerStore } from "../../store/usePlayerStore";

export default function OnlineMenu() {
  const { popScreen, pushScreen } = useScreenStack<HomeScreenStack>();
  const player = usePlayerStore((state) => state.player);
  const setNickname = usePlayerStore((state) => state.setNickname);

  return (
    <section>
      <div className="absolute top-4 left-4">
        <IconButton
          onClick={() => popScreen()}
          icon={<ArrowLeft size={16} />}
        />
      </div>
      <H1 className="text-center mb-1">Online Mode</H1>
      <div className="flex flex-col gap-1.5 text-left">
        <label
          htmlFor="nickname"
          className="text-xs font-semibold uppercase tracking-wider text-neutral-400"
        >
          Nickname
        </label>
        <input
          id="nickname"
          type="text"
          value={player.nickname}
          maxLength={20}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter nickname..."
          className="w-full px-3 py-2 bg-neutral-800/80 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>
      <TankSelector label="Select Your Tank" />
      <div className="flex flex-col gap-3 mt-2">
        <Button color="primary" onClick={() => pushScreen("quickMatchLobby")}>
          Play Quick Match
        </Button>
        <Button color="secondary" onClick={() => pushScreen("privateLobby")}>
          Create Private Room
        </Button>
      </div>
    </section>
  );
}
