import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useEffect, useMemo, useRef, useState } from "react";
import Loader from "../../components/misc/Loader";
import { createOnlineGameManager, GameEngine } from "../../game";
import type { RendererAssets } from "../../game/rendering/CanvasGameRenderer";
import IconButton from "../../components/buttons/IconButton";
import { useAssetStore } from "../../store/useAssetStore";
import useGameSession from "./useGameSession";
import { useAuthStore } from "../../store/useAuthStore";
import InvalidStateError from "../../errors/InvalidStateError";
import UiError from "../../errors/UiError";

export default function GamePage() {
  const { id } = useParams();
  const checked = useCheckValidGameSession({ id });

  if (!checked) {
    return null;
  }

  return <GameView gameSessionId={id!} />;
}

function useCheckValidGameSession({ id }: { id: string | undefined }) {
  const userStatus = useAuthStore((state) => state.userStatus);
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Should never happen because of RefreshUserStatusDecorator
    if (userStatus === null)
      throw new InvalidStateError(
        "User status is null, but should be initialized",
      );

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

    setChecked(true);
  }, [userStatus, id]);

  return checked;
}

function GameView({ gameSessionId }: { gameSessionId: string }) {
  const navigate = useNavigate();
  const { state } = useGameSession(gameSessionId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const tanks = useAssetStore((state) => state.tanks);
  const assetState = useAssetStore((state) => state.state);
  const loadAssets = useAssetStore((state) => state.loadAssets);

  useEffect(() => {
    if (assetState === "idle") {
      loadAssets();
    }
  }, [assetState, loadAssets]);

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

  const [isSessionReady, setIsSessionReady] = useState(false);
  const [hasViewState, setHasViewState] = useState(false);

  useEffect(() => {
    if (client === null) {
      connect();
      return;
    }

    if (status !== "connected") return;

    let cancelled = false;
    let errorsCleanup: (() => void) | undefined;
    setIsSessionReady(false);

    errorsCleanup = client.subscribe<unknown>({
      destination: "/user/queue/errors",
      onMessage: (message) => {
        console.error("Error:", message.body);
      },
    });

    return () => {
      cancelled = true;
      errorsCleanup?.();
      setIsSessionReady(false);
    };
  }, [client, gameSessionId, getAuthStatus, navigate, status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      !client ||
      status !== "connected" ||
      !isSessionReady ||
      rendererAssets === null
    ) {
      return;
    }

    const gameManager = createOnlineGameManager({
      transport: gameplayTransport,
    });
    let engine: GameEngine | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let unsubscribeViewState: (() => void) | null = null;
    let unsubscribeInitialState: () => void = () => {};

    unsubscribeInitialState = gameManager.subscribe(() => {
      if (engine || !canvas) return;

      engineRef.current?.stop();
      engine = new GameEngine({
        canvas,
        gameManager,
        rendererAssets,
      });
      engineRef.current = engine;
      setHasViewState(true);
      unsubscribeViewState = engine.subscribe(() => {
        setHasViewState(true);
      });
      engine.start();

      resizeObserver = new ResizeObserver(() => {
        engine?.resize();
      });
      resizeObserver.observe(canvas);

      unsubscribeInitialState();
      unsubscribeInitialState = () => {};
    });

    return () => {
      unsubscribeInitialState();
      resizeObserver?.disconnect();
      unsubscribeViewState?.();
      engine?.stop();
      if (!engine) {
        gameManager.destroy();
      }
      gameplayTransport.destroy();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
      setHasViewState(false);
    };
  }, [gameSessionId]);

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
          {hasViewState ? "Online Mode" : "Connecting"}
        </div>
      </header>

      <div className="relative flex min-h-[560px] flex-1">
        {(state === "connecting_to_game" ||
          state === "reconnecting_to_game") && (
          <>
            {state === "connecting_to_game" && (
              <p className="text-lg font-medium text-text-body-muted">
                Connecting to game...
              </p>
            )}
            {state === "reconnecting_to_game" && (
              <p className="text-lg font-medium text-text-body-muted">
                Reconnecting to game...
              </p>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded bg-background/70">
              <Loader />
            </div>
          </>
        )}
        <canvas
          ref={canvasRef}
          className="min-h-[560px] min-w-[320px] flex-1 rounded border border-border-main bg-background-high shadow-lg"
        />
      </div>
    </main>
  );
}
