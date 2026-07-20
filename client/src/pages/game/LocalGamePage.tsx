import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createLocalGameManager,
  GameEngine,
  localGameContent,
  type MatchSetup,
} from "../../game";
import type { RendererAssets } from "../../game/rendering/CanvasGameRenderer";
import IconButton from "../../components/buttons/IconButton";
import Loader from "../../components/misc/Loader";
import { useAssetStore, type TankAsset } from "../../store/useAssetStore";

type LocationState = {
  mode: "playerVsAi" | "localTwoPlayer";
  player1Config: {
    name: string;
    tankId: TankAsset["id"];
  };
  player2Config: {
    name: string;
    tankId: TankAsset["id"];
  };
};

function isValidLocationState(state: any): state is LocationState {
  return (
    state &&
    typeof state === "object" &&
    (state.mode === "playerVsAi" || state.mode === "localTwoPlayer") &&
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
  const tanks = useAssetStore((state) => state.tanks);

  if (!state || !isValidLocationState(state) || tanks === null) {
    throw new Error("Invalid state for local game setup");
  }

  const { mode, player1Config, player2Config } = state;

  const rendererAssets = useMemo<RendererAssets>(() => {
    const tankImages: Record<string, HTMLImageElement> = {};
    const projectileImages: Record<string, HTMLImageElement> = {};
    tanks.forEach((t) => {
      if (t.image) {
        tankImages[t.id] = t.image;
        for (const p of t.projectiles) {
          if (p.image) {
            projectileImages[p.id] = p.image;
          }
        }
      }
    });

    return {
      tankImages,
      projectileImages,
    };
  }, [tanks]);

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
          controllerKind: mode === "playerVsAi" ? "ai" : "human",
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
      canvas,
      mode,
      setup: matchSetup,
      content: localGameContent,
    });
    const engine = new GameEngine({
      canvas,
      gameManager,
      rendererAssets,
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
  }, [matchSetup, rendererAssets]);

  const modeLabel = mode === "playerVsAi" ? "Player vs AI" : "Local Two-Player";

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
