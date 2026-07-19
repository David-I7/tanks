import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import { useAuthStore } from "../../store/useAuthStore";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useEffect, useMemo, useRef, useState } from "react";
import Loader from "../../components/misc/Loader";
import { createOnlineGameplayTransport } from "../../game/online/OnlineGameplayTransport";
import { createOnlineGameManager, GameEngine } from "../../game";
import type { RendererAssets } from "../../game/rendering/CanvasGameRenderer";
import IconButton from "../../components/buttons/IconButton";
import { useAssetStore } from "../../store/useAssetStore";

export default function GamePage() {
  const { id } = useParams();

  if (typeof id !== "string" || !uuidSchema.safeParse(id).success) {
    throw new Error("Invalid game id");
  }

  return <GameView gameSessionId={id} />;
}

function useOnlineGame() {}

function GameView({ gameSessionId }: { gameSessionId: string }) {
  const navigate = useNavigate();
  const { status, connect } = useWebSocketStore();
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

  const rendererAssets = useMemo<RendererAssets>(() => {
    const tankImages: Record<string, HTMLImageElement> = {};
    tanks.forEach((t) => {
      if (t.image) {
        tankImages[t.id] = t.image;
      }
    });
    return {
      tankImages,
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

    const gameplayTransport = createOnlineGameplayTransport({
      client,
      gameSessionId,
    });
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
  }, [client, gameSessionId, isSessionReady, rendererAssets, status]);

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
        <canvas
          ref={canvasRef}
          className="min-h-[560px] min-w-[320px] flex-1 rounded border border-border-main bg-background-high shadow-lg"
        />
        {!hasViewState && (
          <div className="absolute inset-0 flex items-center justify-center rounded bg-background/70">
            <Loader />
          </div>
        )}
      </div>
    </main>
  );
}
