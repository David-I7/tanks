import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import { useAuthStore } from "../../store/useAuthStore";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useEffect, useRef, useState } from "react";
import Loader from "../../components/misc/Loader";
import type { GameEvent } from "../../api/ws/dto/game/GameEventDto";
import { createOnlineGameplayTransport } from "../../game/online/OnlineGameplayTransport";
import { createOnlineGameplayAuthority } from "../../game/online/OnlineGameplayAuthority";
import { GameEngine } from "../../game";
import ResourceManager from "../../game/resources/ResourceManager";
import type { RendererAssets } from "../../game/rendering/CanvasGameRenderer";
import IconButton from "../../components/buttons/IconButton";

export default function GamePage() {
  const { id } = useParams();

  if (typeof id !== "string" || !uuidSchema.safeParse(id).success) {
    throw new Error("Invalid game id");
  }

  return <GameView gameSessionId={id} />;
}

function GameView({ gameSessionId }: { gameSessionId: string }) {
  const navigate = useNavigate();
  const { client, status, connect } = useWebSocketStore();
  const getAuthStatus = useAuthStore(state => state.getAuthStatus);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [rendererAssets, setRendererAssets] = useState<RendererAssets | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [hasViewState, setHasViewState] = useState(false);
  const [localPlayerId, setLocalPlayerId] = useState<number | null>(null);

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

    void (async () => {
      const authStatus = await getAuthStatus();
      if (cancelled) return;

      if (authStatus?.userSessionStatus?.state !== "IN_GAME" || authStatus.userSessionStatus.gameId !== gameSessionId) {
        navigate("/", { replace: true });
        return;
      }

      setIsSessionReady(true);
    })();

    return () => {
      cancelled = true;
      errorsCleanup?.();
      setIsSessionReady(false);
    };
  }, [client, gameSessionId, getAuthStatus, navigate, status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !client || status !== "connected" || !isSessionReady || rendererAssets === null) {
      return;
    }

    const gameplayTransport = createOnlineGameplayTransport({
      client,
      gameSessionId,
    });
    const gameplayAuthority = createOnlineGameplayAuthority({
      transport: gameplayTransport,
    });
    const unsubscribeGameEvents = gameplayTransport.subscribeToGameEvents((event: GameEvent) => {
      if (event.type === "GAME_STARTED" && event.payload.gameSessionId === gameSessionId) {
        setLocalPlayerId(event.payload.localPlayerId);
      }
    });
    const engine = new GameEngine({
      canvas,
      mode: "online",
      authority: gameplayAuthority,
      onlineTransport: gameplayTransport,
      localPlayerId: localPlayerId ?? undefined,
      rendererAssets,
    });

    engineRef.current?.stop();
    engineRef.current = engine;
    setHasViewState(Boolean(engine.getViewState()));
    const unsubscribeViewState = engine.subscribe(() => {
      setHasViewState(true);
    });
    engine.start();

    const resizeObserver = new ResizeObserver(() => {
      engine.resize();
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      unsubscribeGameEvents();
      unsubscribeViewState();
      engine.stop();
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
          <IconButton onClick={() => navigate("/")} icon={<ArrowLeft size={16} />} />
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
          className="min-h-[560px] flex-1 rounded border border-border-main bg-background-high shadow-lg"
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
