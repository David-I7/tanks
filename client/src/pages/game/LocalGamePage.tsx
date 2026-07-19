import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createCanvasSizedLocalGameManager,
  GameEngine,
  type GameMode,
  type MatchSetup,
} from "../../game";
import type { RendererAssets } from "../../game/rendering/CanvasGameRenderer";
import IconButton from "../../components/buttons/IconButton";
import { useAssetStore } from "../../store/useAssetStore";

export default function LocalGamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const tanks = useAssetStore((state) => state.tanks);
  const isLoaded = useAssetStore((state) => state.isLoaded);
  const loadAssets = useAssetStore((state) => state.loadAssets);

  useEffect(() => {
    if (!isLoaded) {
      loadAssets();
    }
  }, [isLoaded, loadAssets]);

  const projectileImages = useAssetStore((state) => state.projectileImages);

  const rendererAssets = useMemo<RendererAssets>(() => {
    const tankImages: Record<string, HTMLImageElement> = {};
    tanks.forEach((t) => {
      if (t.image) {
        tankImages[t.id] = t.image;
      }
    });
    const firstImage = Object.values(tankImages)[0];
    return {
      tankImages,
      projectileImages,
      tankImage: firstImage,
    };
  }, [tanks, projectileImages]);

  const modeParam = searchParams.get("mode");
  const mode: GameMode =
    modeParam === "playerVsAi" ? "playerVsAi" : "localTwoPlayer";

  const p1Name = searchParams.get("p1Name") || "Player 1";
  const p1Tank = searchParams.get("p1Tank") || "heavy-armor";
  const p2Name =
    searchParams.get("p2Name") ||
    (mode === "playerVsAi" ? "AI Bot" : "Player 2");
  const p2Tank =
    searchParams.get("p2Tank") ||
    (mode === "playerVsAi" ? "desert-striker" : "vanguard-cyber");

  const matchSetup = useMemo<MatchSetup>(
    () => ({
      mode,
      players: [
        {
          id: 0,
          displayName: p1Name,
          controllerKind: "human",
          tankSelection: { tankDefinitionId: p1Tank },
        },
        {
          id: 1,
          displayName: p2Name,
          controllerKind: mode === "playerVsAi" ? "ai" : "human",
          tankSelection: { tankDefinitionId: p2Tank },
        },
      ],
    }),
    [mode, p1Name, p1Tank, p2Name, p2Tank],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    engineRef.current?.stop();
    const gameManager = createCanvasSizedLocalGameManager({
      canvas,
      mode,
      setup: matchSetup,
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
  }, [mode, matchSetup, rendererAssets]);

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
