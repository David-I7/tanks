import { useState, useMemo } from "react";
import { ArrowLeft, Bug } from "lucide-react";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import H1 from "../../components/headings/H1";
import Surface from "../../components/layouts/Surface";
import TankSelector from "../../components/game/TankSelector";
import { useScreenStack } from "../../context/ScreenStack";
import { useNavigate } from "react-router-dom";
import type { TankAsset } from "../../hooks/useAssetQuery";

type PlayerConfig = {
  name: string;
  tankId: TankAsset["id"];
};

export default function OfflineMenu() {
  const { popScreen } = useScreenStack();
  const navigate = useNavigate();

  const isDebugInitial = useMemo(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("debug") === "true") return true;
    }
    return (
      import.meta.env.DEV ||
      import.meta.env.VITE_DEBUG_TESTS === "true"
    );
  }, []);

  const [debugMode, setDebugMode] = useState<boolean>(isDebugInitial);

  const [player1Config, setPlayer1Config] = useState<PlayerConfig>({
    name: "Player 1",
    tankId: "",
  });
  const [player2Config, setPlayer2Config] = useState<PlayerConfig>({
    name: "Player 2",
    tankId: "",
  });

  const handleStartGame = () => {
    navigate(`/game/local`, {
      state: { mode: "localTwoPlayer", player1Config, player2Config },
    });
  };

  return (
    <Surface className="px-6 py-6 w-full max-w-lg flex flex-col gap-5 text-center relative pt-14 max-h-[90vh] overflow-y-auto">
      <div className="absolute top-4 left-4">
        <IconButton
          onClick={() => popScreen()}
          icon={<ArrowLeft size={16} />}
        />
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setDebugMode((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
            debugMode
              ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm"
              : "bg-background-high border-border-main text-text-body-muted hover:text-text-body-high"
          }`}
          title="Toggle Weapon Debug Descriptions"
        >
          <Bug size={13} />
          <span>Debug</span>
        </button>
      </div>

      <H1 className="text-center mb-1">Offline Setup</H1>

      {/* Player 1 Configuration */}
      <div className="flex flex-col gap-3 text-left border border-border-main p-4 rounded-lg bg-background-high/40">
        <label className="text-xs font-bold uppercase tracking-wider text-primary">
          Player 1 Details
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-body-muted font-medium">
            Player Name
          </span>
          <input
            type="text"
            value={player1Config.name}
            onChange={(e) =>
              setPlayer1Config({ ...player1Config, name: e.target.value })
            }
            placeholder="Enter Player 1 Name"
            className="w-full bg-background border border-border-main rounded-md px-3 py-2 text-xs text-text-body-high outline-none focus:border-primary"
          />
        </div>
        <TankSelector
          onTankSelect={(tank) =>
            setPlayer1Config({ ...player1Config, tankId: tank.id })
          }
          selectedTankId={player1Config.tankId}
          label="Tank Choice"
          debugMode={debugMode}
        />
      </div>

      {/* Player 2 Configuration */}
      <div className="flex flex-col gap-3 text-left border border-border-main p-4 rounded-lg bg-background-high/40">
        <label className="text-xs font-bold uppercase tracking-wider text-secondary">
          Player 2 Details
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-body-muted font-medium">
            Player Name
          </span>
          <input
            type="text"
            value={player2Config.name}
            onChange={(e) =>
              setPlayer2Config({ ...player2Config, name: e.target.value })
            }
            placeholder="Enter Player 2 Name"
            className="w-full bg-background border border-border-main rounded-md px-3 py-2 text-xs text-text-body-high outline-none focus:border-primary"
          />
        </div>
        <TankSelector
          onTankSelect={(tank) =>
            setPlayer2Config({ ...player2Config, tankId: tank.id })
          }
          selectedTankId={player2Config.tankId}
          label="Tank Choice"
          debugMode={debugMode}
        />
      </div>

      <Button
        color="primary"
        onClick={handleStartGame}
        disabled={
          !player1Config.name ||
          !player1Config.tankId ||
          !player2Config.name ||
          !player2Config.tankId
        }
        className="w-full font-black text-sm tracking-widest mt-2"
      >
        Start Game
      </Button>
    </Surface>
  );
}
