import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";
import Loader from "../../components/misc/Loader";
import { GameEngine } from "../../game";
import type { RendererAssets } from "../../game/rendering/CanvasGameRenderer";
import IconButton from "../../components/buttons/IconButton";
import useGameSession from "./useGameSession";
import UiError from "../../errors/UiError";
import { useUserStatusQuery } from "../../hooks/useUserStatusQuery";
import { useAssetQuery } from "../../hooks/useAssetQuery";

export default function GamePage() {
  const { id } = useParams();
  const checked = useCheckValidGameSession({ id });

  if (!checked) {
    return null;
  }

  return <GameView gameSessionId={id!} />;
}

function useCheckValidGameSession({ id }: { id: string | undefined }) {
  const { data: userStatus, isPending } = useUserStatusQuery();
  const navigate = useNavigate();

  if (userStatus == null || isPending) return false;

  if (userStatus.state !== "IN_GAME") {
    if (userStatus.state === "IDLE") {
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
  }

  if (userStatus.gameId !== id) {
    navigate(`/game/${userStatus.gameId}`, { replace: true });
  }

  return true;
}

function GameView({ gameSessionId }: { gameSessionId: string }) {
  const navigate = useNavigate();
  const { sessionStatus, gameManager } = useGameSession(gameSessionId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const { data: tanks } = useAssetQuery();

  const rendererAssets = useMemo<RendererAssets>(() => {
    const tankImages: Record<string, HTMLImageElement> = {};
    const projectileImages: Record<string, HTMLImageElement> = {};

    if (tanks) {
      tanks.forEach((t) => {
        if (t.image) {
          tankImages[t.id] = t.image;
        }
        t.projectiles?.forEach((p) => {
          if (p.image) {
            projectileImages[p.id] = p.image;
          }
        });
      });
    }

    return {
      tankImages,
      projectileImages,
      tankImage: Object.values(tankImages)[0],
    };
  }, [tanks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sessionStatus !== "in_game" || !gameManager) return;

    engineRef.current?.stop();
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
  }, [sessionStatus, gameManager, rendererAssets]);

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
          {sessionStatus === "in_game" ? "Online Mode" : "Connecting"}
        </div>
      </header>

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
        <canvas
          ref={canvasRef}
          className="min-h-[560px] min-w-[320px] flex-1 rounded border border-border-main bg-background-high shadow-lg"
        />
      </div>
    </main>
  );
}
