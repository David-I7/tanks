import { Bot, Monitor, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  GameEngine,
  type GameMode,
} from "../../game";
import { createMockRemoteTransport } from "../../game/authority/createMockRemoteTransport";
import { mockGameContent } from "../../game/content/mockGameContent";
import { createDefaultMatchSetup } from "../../game/simulation/createInitialWorld";

const modes: Array<{ value: GameMode; label: string; icon: typeof Monitor }> = [
  { value: "twoPlayer", label: "2 Player", icon: Monitor },
  { value: "ai", label: "Player vs AI", icon: Bot },
  { value: "online", label: "Online", icon: Radio },
];

export default function TestPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [mode, setMode] = useState<GameMode>("twoPlayer");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    engineRef.current?.stop();
    const engine = new GameEngine({
      canvas,
      mode,
      remoteTransport:
        mode === "online"
          ? createMockRemoteTransport({
              setup: createDefaultMatchSetup("online"),
              content: mockGameContent,
              width: canvas.width,
              height: canvas.height,
            })
          : undefined,
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
  }, [mode]);

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
