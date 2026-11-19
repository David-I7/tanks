import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Loader from "../../components/misc/Loader";
import { GameEngine } from "../../features/game";
import IconButton from "../../components/buttons/IconButton";
import useGameSession from "./useGameSession";
import GameOverOverlay from "../../components/game/GameOverOverlay";
import { useScreenStack } from "../../context/ScreenStack";
import type { HomeScreenStack } from "../home/HomePage";

export default function OnlineGameScreen() {
  const { state, popScreen } = useScreenStack<HomeScreenStack>();
  const gameSessionId = (state as { gameSessionId?: string } | null)
    ?.gameSessionId;

  if (!gameSessionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-100">
        <p className="text-sm text-neutral-400 mb-4">
          No active game session found.
        </p>
        <button
          onClick={() => popScreen()}
          className="px-4 py-2 bg-neutral-700 text-white font-semibold rounded hover:bg-neutral-600 text-xs"
        >
          Back
        </button>
      </div>
    );
  }

  return <GameView gameSessionId={gameSessionId} onLeaveLobby={popScreen} />;
}

type GameOverInfo = {
  isGameOver: boolean;
  winnerName: string | null;
  isDraw: boolean;
};

export type GameViewProps = {
  gameSessionId: string;
  onReturnToLobby?: () => void;
  onLeaveLobby: () => void;
};

export function GameView({
  gameSessionId,
  onReturnToLobby,
  onLeaveLobby,
}: GameViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);

  const {
    sessionStatus,
    opponentDisconnected,
    gameManager,
    error,
    forfeitGame,
    retryJoin,
  } = useGameSession(gameSessionId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameManager) return;

    const engine = new GameEngine({
      canvas,
      gameManager,
    });
    engineRef.current = engine;

    const unsubscribe = engine.subscribe((state) => {
      if (state.match.phase === "gameOver") {
        const winnerId = state.match.winnerPlayerId;
        const winnerName =
          winnerId !== null && winnerId !== undefined
            ? `Player ${winnerId}`
            : null;
        setGameOverInfo((prev) => {
          if (prev?.isGameOver) return prev;
          return {
            isGameOver: true,
            winnerName,
            isDraw: winnerId === null || winnerId === undefined,
          };
        });
      }
    });

    engine.start();

    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      unsubscribe();
      engine.stop();
      engineRef.current = null;
    };
  }, [gameManager]);

  const handleLeaveGame = () => {
    onLeaveLobby();
  };

  const handleForfeit = () => {
    forfeitGame();
  };

  if (
    sessionStatus === "connecting_to_game" ||
    sessionStatus === "starting_game"
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-100">
        <Loader />
        <p className="mt-4 text-sm text-neutral-400">Loading Game Session...</p>
      </div>
    );
  }

  if (sessionStatus === "error" || error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-neutral-100">
        <h2 className="text-xl font-bold text-red-500 mb-2">
          Connection Error
        </h2>
        <p className="text-neutral-400 mb-4 text-xs max-w-md text-center">
          {error?.message || "Failed to connect to game session."}
        </p>
        <div className="flex gap-4">
          <button
            onClick={retryJoin}
            className="px-4 py-2 bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 text-xs"
          >
            Retry
          </button>
          <button
            onClick={handleLeaveGame}
            className="px-4 py-2 bg-neutral-700 text-white font-semibold rounded hover:bg-neutral-600 text-xs"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-neutral-950">
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        <IconButton icon={<ArrowLeft size={18} />} onClick={handleForfeit} />
      </div>

      {opponentDisconnected && (
        <div className="absolute top-4 right-16 z-20 px-3 py-1 bg-amber-900/80 border border-amber-600/50 rounded text-xs text-amber-200">
          Opponent reconnecting...
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
      />

      {gameOverInfo?.isGameOver && (
        <GameOverOverlay
          winnerName={gameOverInfo.winnerName}
          isDraw={gameOverInfo.isDraw}
          onReturnToLobby={onReturnToLobby}
          onReturnHome={handleLeaveGame}
        />
      )}
    </div>
  );
}
