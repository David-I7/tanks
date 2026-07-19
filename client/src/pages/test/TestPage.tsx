import { Bot, Monitor, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  createCanvasSizedLocalGameManager,
  GameEngine,
  type GameMode,
} from "../../game";
import ResourceManager from "../../game/rendering/ResourceManager";
import type { RendererAssets } from "../../game/rendering/CanvasGameRenderer";

const modes: Array<{ value: GameMode; label: string; icon: typeof Monitor }> = [
  { value: "localTwoPlayer", label: "Local Two-Player", icon: Monitor },
  { value: "playerVsAi", label: "Player vs AI", icon: Bot },
  { value: "online", label: "Online", icon: Radio },
];

export default function TestPage() {
  const location = useLocation();
  const stateMode = (location.state as any)?.mode;
  const initialMode = stateMode === "playerVsAi" || stateMode === "localTwoPlayer" || stateMode === "online" ? stateMode : "localTwoPlayer";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [rendererAssets, setRendererAssets] = useState<RendererAssets>({});

  useEffect(() => {
    let cancelled = false;
    ResourceManager.getInstance()
      .getImage("heavy-armor")
      .then((tankImage) => {
        if (!cancelled && tankImage) setRendererAssets({ tankImage });
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
    const gameManager = createCanvasSizedLocalGameManager({
      canvas,
      mode: mode === "online" ? "localTwoPlayer" : mode,
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
  }, [mode, rendererAssets]);

  return (
    <main className="relative z-10 flex min-h-screen flex-col bg-background p-4 text-text-body-high">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {modes.map((entry) => {
          const Icon = entry.icon;
          const selected = entry.value === mode;

          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => setMode(entry.value)}
              className={[
                "flex h-10 items-center gap-2 rounded border px-3 font-body text-sm transition",
                selected
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border-main bg-surface-main text-text-body-high hover:border-border-high",
              ].join(" ")}
            >
              <Icon size={16} aria-hidden="true" />
              {entry.label}
            </button>
          );
        })}
      </div>

      <canvas
        ref={canvasRef}
        className="min-h-[560px] flex-1 rounded border border-border-main bg-background-high"
      />
    </main>
  );
}
