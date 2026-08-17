import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createLocalGameManager,
  GameEngine,
  ResourceManager,
  type MatchSetup,
} from "../../game";
import IconButton from "../../components/buttons/IconButton";
import type { TankDefinitionIds } from "../../game/rendering/ResourceManager";

type LocationState = {
  mode: "localTwoPlayer";
  player1Config: {
    name: string;
    tankId: TankDefinitionIds;
  };
  player2Config: {
    name: string;
    tankId: TankDefinitionIds;
  };
};

function isValidLocationState(state: any): state is LocationState {
  return (
    state &&
    typeof state === "object" &&
    state.mode === "localTwoPlayer" &&
    typeof state.player1Config === "object" &&
    typeof state.player2Config === "object" &&
    "name" in state.player1Config &&
    "tankId" in state.player1Config &&
    "name" in state.player2Config &&
    "tankId" in state.player2Config
  );
}

export default function LocalGamePage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const location = useLocation();
  const state = location.state as LocationState | null;

  if (!state || !isValidLocationState(state)) {
    throw new Error("Invalid state for local game setup");
  }

  const { mode, player1Config, player2Config } = state;

  const matchSetup = useMemo<MatchSetup>(
    () => ({
      mode,
      players: [
        {
          id: 0,
          displayName: player1Config.name,
          controllerKind: "human",
          tankSelection: { tankDefinitionId: player1Config.tankId },
        },
        {
          id: 1,
          displayName: player2Config.name,
          controllerKind: "human",
          tankSelection: { tankDefinitionId: player2Config.tankId },
        },
      ],
    }),
    [mode, player1Config, player2Config],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    engineRef.current?.stop();
    const gameManager = createLocalGameManager({
      mode,
      setup: matchSetup,
      content: ResourceManager.getInstance().getGameContent(),
    });
    const engine = new GameEngine({
      canvas,
      gameManager,
    });

    engineRef.current = engine;
    engine.start();

    const resizeObserver = new ResizeObserver(() => {
      engine.resize();
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      engine.stop();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [matchSetup]);

  const modeLabel = "Local Two-Player";

  return (
    <main className="relative z-10 flex min-h-screen flex-col bg-background p-4 text-text-body-high">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconButton
            onClick={() => navigate("/")}
            icon={<ArrowLeft size={16} />}
          />
          <h1 className="font-heading text-xl font-bold tracking-wide text-primary">
            {modeLabel}
          </h1>
        </div>
        <div className="text-sm font-medium text-text-body-muted">
          Offline Mode
        </div>
      </header>

      <canvas
        ref={canvasRef}
        className="min-h-[560px] min-w-[320px] flex-1 rounded border border-border-main bg-background-high shadow-lg"
      />
    </main>
  );
}
