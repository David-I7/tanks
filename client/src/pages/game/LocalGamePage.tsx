import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GameEngine, type GameMode } from "../../game";
import ResourceManager from "../../game/resources/ResourceManager";
import type { RendererAssets } from "../../game/rendering/CanvasGameRenderer";
import IconButton from "../../components/buttons/IconButton";

export default function LocalGamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [rendererAssets, setRendererAssets] = useState<RendererAssets>({});

  const modeParam = searchParams.get("mode");
  const mode: GameMode = modeParam === "playerVsAi" ? "playerVsAi" : "localTwoPlayer";

  useEffect(() => {
    let cancelled = false;
    ResourceManager.getInstance()
      .getImage("tank")
      .then((tankImage) => {
        if (!cancelled) setRendererAssets({ tankImage });
      })
      .catch(() => {
        if (!cancelled) setRendererAssets({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    engineRef.current?.stop();
    const engine = new GameEngine({
      canvas,
      mode,
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
  }, [mode, rendererAssets]);

  const modeLabel = mode === "playerVsAi" ? "Player vs AI" : "Local Two-Player";

  return (
    <main className="relative z-10 flex min-h-screen flex-col bg-background p-4 text-text-body-high">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => navigate("/")} icon={<ArrowLeft size={16} />} />
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
        className="min-h-[560px] flex-1 rounded border border-border-main bg-background-high shadow-lg"
      />
    </main>
  );
}
