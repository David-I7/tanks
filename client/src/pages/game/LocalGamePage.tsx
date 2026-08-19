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
import Loader from "../../components/misc/Loader";
import { useAssetQuery } from "../../hooks/useAssetQuery";
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
  const { data: assets, isLoading: isAssetsLoading } = useAssetQuery();

  useEffect(() => {
    if (!state || !isValidLocationState(state)) {
      navigate("/");
    }
  }, [state, navigate]);

  const matchSetup = useMemo<MatchSetup | null>(() => {
    if (!state || !isValidLocationState(state)) {
      return null;
    }
    return {
      mode: state.mode,
      players: [
        {
          id: 0,
          displayName: state.player1Config.name,
          controllerKind: "human",
          tankSelection: { tankDefinitionId: state.player1Config.tankId },
        },
        {
          id: 1,
          displayName: state.player2Config.name,
          controllerKind: "human",
          tankSelection: { tankDefinitionId: state.player2Config.tankId },
        },
      ],
    };
  }, [state]);

  const isReady =
    !isAssetsLoading && Boolean(assets) && ResourceManager.getInstance().isLoaded();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isReady || !matchSetup) return;

    engineRef.current?.stop();
    const gameManager = createLocalGameManager({
      mode: "localTwoPlayer",
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
  }, [matchSetup, isReady]);

  const modeLabel = "Local Two-Player";

  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-background text-text-body-high">
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <IconButton
          onClick={() => navigate("/")}
          icon={<ArrowLeft size={16} />}
        />
        <span className="font-heading text-xs font-bold tracking-wider uppercase text-text-body-high bg-background/80 px-2.5 py-1 rounded backdrop-blur-md shadow border border-border-low">
          {modeLabel}
        </span>
      </div>

      <div className="relative w-full h-full overflow-hidden">
        {!isReady && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 gap-3 backdrop-blur-sm">
            <Loader />
            <p className="text-sm font-medium text-text-body-muted">
              Loading game assets...
            </p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full block bg-black touch-none select-none"
        />
      </div>
    </main>
  );
}
