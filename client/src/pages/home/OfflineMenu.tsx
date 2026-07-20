import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import H1 from "../../components/headings/H1";
import Surface from "../../components/layouts/Surface";
import TankSelector from "../../components/game/TankSelector";
import { useScreenStack } from "../../context/ScreenStack";
import { useNavigate } from "react-router-dom";
import { useAssetStore, type TankAsset } from "../../store/useAssetStore";
import randInt from "../../utils/random";

type PlayerConfig = {
  name: string;
  tankId: TankAsset["id"];
};

export default function OfflineMenu() {
  const { popScreen } = useScreenStack();
  const navigate = useNavigate();
  const tanks = useAssetStore((state) => state.tanks);

  const [mode, setMode] = useState<"playerVsAi" | "localTwoPlayer">(
    "playerVsAi",
  );
  const [player1Config, setPlayer1Config] = useState<PlayerConfig>({
    name: "Player 1",
    tankId:
      tanks === null ? "heavy-armor" : tanks[randInt(0, tanks.length - 1)].id,
  });
  const [player2Config, setPlayer2Config] = useState<PlayerConfig>({
    name: "Player 2",
    tankId:
      tanks === null
        ? "desert-striker"
        : tanks[randInt(0, tanks.length - 1)].id,
  });

  const handleStartGame = () => {
    navigate(`/game/local`, { state: { mode, player1Config, player2Config } });
  };

  if (tanks === null) {
    return "Loading tanks...";
  }

  return (
    <Surface className="px-6 py-6 w-full max-w-lg flex flex-col gap-5 text-center relative pt-14 max-h-[90vh] overflow-y-auto">
      <div className="absolute top-4 left-4">
        <IconButton
          onClick={() => popScreen()}
          icon={<ArrowLeft size={16} />}
        />
      </div>
      <H1 className="text-center mb-1">Offline Setup</H1>

      {/* Mode Selection Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-background/50 p-1 rounded-lg border border-border-main">
        <button
          type="button"
          onClick={() => setMode("playerVsAi")}
          className={`py-2 px-3 text-xs font-bold rounded-md transition-all ${
            mode === "playerVsAi"
              ? "bg-primary text-text-white shadow"
              : "text-text-body-muted hover:text-text-body-high"
          }`}
        >
          Player vs AI
        </button>
        <button
          type="button"
          onClick={() => setMode("localTwoPlayer")}
          className={`py-2 px-3 text-xs font-bold rounded-md transition-all ${
            mode === "localTwoPlayer"
              ? "bg-primary text-text-white shadow"
              : "text-text-body-muted hover:text-text-body-high"
          }`}
        >
          Local Two-Player
        </button>
      </div>

      {/* Player 1 Configuration */}
      <div className="flex flex-col gap-3 text-left border border-border-main p-4 rounded-lg bg-background-high/40">
        <label className="text-xs font-bold uppercase tracking-wider text-primary">
          {mode === "localTwoPlayer" ? "Player 1 Details" : "Player Details"}
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
          label="Tank Choice"
        />
      </div>

      {/* Player 2 Configuration (Local Two-Player) */}
      {mode === "localTwoPlayer" && (
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
            label="Tank Choice"
          />
        </div>
      )}

      <Button
        color="primary"
        onClick={handleStartGame}
        className="w-full font-black text-sm tracking-widest mt-2"
      >
        Start Game
      </Button>
    </Surface>
  );
}
