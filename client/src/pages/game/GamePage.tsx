import { ArrowLeft } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Loader from "../../components/misc/Loader";
import { GameEngine, type GameState } from "../../game";
import IconButton from "../../components/buttons/IconButton";
import useGameSession from "./useGameSession";
import UiError from "../../errors/UiError";
import { useUserStatusQuery } from "../../hooks/useUserStatusQuery";
import GameOverOverlay from "../../components/game/GameOverOverlay";

export default function GamePage() {
  const { id } = useParams();
  const checked = useCheckValidGameSession({ id });

  if (checked === false) {
    return null;
  } else if (checked !== true) {
    return checked;
  }

  return <GameView gameSessionId={id!} />;
}

function useCheckValidGameSession({ id }: { id: string | undefined }) {
  const { data: userStatus, isFetching } = useUserStatusQuery();

  if (isFetching) return false;

  if (userStatus == undefined || userStatus.state === "IDLE") {
    throw new UiError({
      description:
        "You are not currently in a game. Please join a game session first.",
      heading: "Not in a game session",
    });
  } else if (userStatus.state === "IN_LOBBY") {
    throw new UiError({
      description:
        "You are currently in a lobby. Please join a game session from the lobby.",
      heading: "In a lobby",
    });
  }

  if (userStatus.gameId !== id) {
    return <Navigate to={`/game/${userStatus.gameId}`} replace={true} />;
  }

  return true;
}

function GameView({ gameSessionId }: { gameSessionId: string }) {
  const navigate = useNavigate();
  const { sessionStatus, opponentDisconnected, gameManager } =
    useGameSession(gameSessionId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!gameManager) return;
    setGameState(gameManager.getState());
    const unsubscribe = gameManager.subscribe((state) => {
      setGameState(state);
    });
    return unsubscribe;
  }, [gameManager]);

  const isGameActive =
    sessionStatus === "in_game" || sessionStatus === "game_over";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isGameActive || !gameManager) return;

    engineRef.current?.stop();
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
  }, [isGameActive, gameManager]);

  const currentState =
    gameState ?? engineRef.current?.getState() ?? gameManager?.getState();
  const winnerPlayerId = currentState?.match.winnerPlayerId ?? null;
  const isDraw = winnerPlayerId === null;
  const winnerTank = currentState?.tanks.find(
    (t) => t.playerId === winnerPlayerId,
  );
  const winnerName = winnerTank
    ? winnerTank.displayName
    : winnerPlayerId !== null
      ? `Player ${winnerPlayerId + 1}`
      : null;

  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-background text-text-body-high">
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <IconButton
          onClick={() => navigate("/")}
          icon={<ArrowLeft size={16} />}
        />
        <span className="font-heading text-xs font-bold tracking-wider uppercase text-text-body-high bg-background/80 px-2.5 py-1 rounded backdrop-blur-md shadow border border-border-low">
          Online Match
        </span>
      </div>

      {opponentDisconnected && sessionStatus === "in_game" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 rounded bg-amber-500/20 backdrop-blur-md border border-amber-500/40 px-4 py-1.5 text-center text-xs font-semibold text-amber-300 animate-pulse shadow-md">
          Opponent disconnected! Waiting for them to reconnect (Match clock
          continues running...)
        </div>
      )}

      <div className="relative w-full h-full overflow-hidden">
        {(sessionStatus === "connecting_to_game" ||
          sessionStatus === "reconnecting_to_game" ||
          sessionStatus === "starting_game") && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 gap-3 backdrop-blur-sm">
            {sessionStatus === "connecting_to_game" && (
              <p className="text-lg font-medium text-text-body-muted">
                Connecting to game...
              </p>
            )}
            {sessionStatus === "reconnecting_to_game" && (
              <p className="text-lg font-medium text-text-body-muted">
                Reconnecting to game...
              </p>
            )}
            {sessionStatus === "starting_game" && (
              <p className="text-lg font-medium text-text-body-muted">
                Starting game...
              </p>
            )}
            <Loader />
          </div>
        )}

        {sessionStatus === "game_over" && (
          <GameOverOverlay
            winnerName={winnerName}
            isDraw={isDraw}
            onReturnHome={() => navigate("/")}
          />
        )}

        <canvas
          ref={canvasRef}
          className="w-full h-full block bg-black touch-none select-none"
        />
      </div>
    </main>
  );
}
