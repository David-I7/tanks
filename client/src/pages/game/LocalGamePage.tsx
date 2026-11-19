import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import {
  createLocalGameManager,
  GameEngine,
  localGameContent,
  type MatchSetup,
  type TankDefinitionIds,
} from "../../features/game";
import IconButton from "../../components/buttons/IconButton";
import { useScreenStack } from "../../context/ScreenStack";
import type { HomeScreenStack } from "../home/HomePage";

export type LocalGameLocationState = {
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

function isValidLocationState(state: unknown): state is LocalGameLocationState {
  return (
    Boolean(state) &&
    typeof state === "object" &&
    state !== null &&
    "mode" in state &&
    (state as { mode: unknown }).mode === "localTwoPlayer" &&
    "player1Config" in state &&
    "player2Config" in state
  );
}

export default function LocalGameScreen() {
  const { popScreen, state } = useScreenStack<HomeScreenStack>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const fallbackState: LocalGameLocationState = useMemo(
    () => ({
      mode: "localTwoPlayer",
      player1Config: { name: "Player 1", tankId: "heavy-armor" },
      player2Config: { name: "Player 2", tankId: "desert-striker" },
    }),
    [],
  );

  const activeConfig = isValidLocationState(state) ? state : fallbackState;
  const { mode, player1Config, player2Config } = activeConfig;

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
      canvas,
      mode,
      setup: matchSetup,
      content: localGameContent,
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
  }, [matchSetup, mode]);

  return (
    <main className="relative z-10 flex min-h-screen w-full flex-col bg-background p-4 text-text-body-high">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconButton
            onClick={() => popScreen()}
            icon={<ArrowLeft size={16} />}
          />
          <h1 className="font-heading text-xl font-bold tracking-wide text-primary">
            Local Two-Player
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
