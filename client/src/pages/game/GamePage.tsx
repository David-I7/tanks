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
    <main className="relative z-10 flex min-h-screen flex-col bg-background p-4 text-text-body-high">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconButton
            onClick={() => navigate("/")}
            icon={<ArrowLeft size={16} />}
          />
          <h1 className="font-heading text-xl font-bold tracking-wide text-primary">
            Online Game
          </h1>
        </div>
        <div className="text-sm font-medium text-text-body-muted">
          {sessionStatus === "in_game" || sessionStatus === "game_over"
            ? "Online Mode"
            : "Connecting"}
        </div>
      </header>

      {opponentDisconnected && sessionStatus === "in_game" && (
        <div className="mb-3 rounded bg-amber-500/10 border border-amber-500/30 px-4 py-2 text-center text-sm font-semibold text-amber-400 animate-pulse">
          Opponent disconnected! Waiting for them to reconnect (Match clock
          continues running...)
        </div>
      )}

      <div className="relative flex min-h-[560px] flex-1">
        {(sessionStatus === "connecting_to_game" ||
          sessionStatus === "reconnecting_to_game" ||
          sessionStatus === "starting_game") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded bg-background/70 gap-3">
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
          className="min-h-[560px] min-w-[320px] flex-1 rounded border border-border-main bg-background-high shadow-lg"
        />
      </div>
    </main>
  );
}
