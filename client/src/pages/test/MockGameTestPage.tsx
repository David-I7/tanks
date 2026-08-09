import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import TanksClient from "../../api/http/TanksClient";
import { createMockGame, createStompClient } from "../../../test/integration/mockGameHarness";
import {
  setupGameTopicSubscription,
  setupLobbyTopicSubscription,
  setupUserErrorsSubscription,
  setupUserRepliesSubscription,
  waitForReply,
} from "../../../test/integration/harnessUtils";
import { GameEngine } from "../../game";
import useGameSession from "../game/useGameSession";
import type { GameManager } from "../../game";
import type { SessionStatus } from "../game/useGameSession";

// ─── Module-level synchronous pre-init ────────────────────────────────────────
// This runs once when the module is first evaluated (before any React renders).
// Injecting the token here guarantees InitializeAuthDecorator's useEffect sees
// `initialized: true` and skips the cookie-based refresh that would otherwise
// clobber our injected access token.
{
  const params = new URLSearchParams(window.location.search);
  const _token = params.get("token");
  const _gameId = params.get("gameId");
  const _playerNum = params.get("playerNum");
  if (_token && _gameId && _playerNum) {
    const pNum = Number(_playerNum);
    TanksClient.setAccessToken(_token);
    useAuthStore.setState({
      accessToken: _token,
      user: { id: pNum, username: `tt${pNum}`, email: `test${pNum}@gmail.com` } as any,
      userStatus: { state: "IN_GAME", gameId: _gameId } as any,
      initialized: true,
    });
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export default function MockGameTestPage() {
  const [searchParams] = useSearchParams();
  const gameIdParam = searchParams.get("gameId");
  const tokenParam = searchParams.get("token");
  const playerNumParam = searchParams.get("playerNum");

  const isPlayerTab = Boolean(gameIdParam && tokenParam && playerNumParam);

  // initialized starts true for player tabs (module-level block already injected auth)
  const [initialized, setInitialized] = useState<boolean>(!isPlayerTab || useAuthStore.getState().initialized);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gameSessionId, setGameSessionId] = useState<string | null>(gameIdParam);
  const [p1Url, setP1Url] = useState<string | null>(null);
  const [p2Url, setP2Url] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(`[TEST-PAGE] ${msg}`);
    (window as any).testLogs = (window as any).testLogs || [];
    (window as any).testLogs.push(msg);
    setLogs((prev) => [msg, ...prev.slice(0, 99)]);
  };

  useEffect(() => {
    if (isPlayerTab && tokenParam && gameIdParam && playerNumParam) {
      const pNum = Number(playerNumParam);
      addLog(`Initializing Auth for Player ${pNum}...`);

      // Re-apply in case the module-level block ran before the store was observed
      TanksClient.setAccessToken(tokenParam);
      useAuthStore.setState({
        accessToken: tokenParam,
        user: { id: pNum, username: `tt${pNum}`, email: `test${pNum}@gmail.com` } as any,
        userStatus: { state: "IN_GAME", gameId: gameIdParam } as any,
        initialized: true,
      });

      const wsStore = useWebSocketStore.getState();
      if (wsStore.status === "disconnected") {
        wsStore.connect();
      }

      setInitialized(true);
    }
  }, [isPlayerTab, tokenParam, gameIdParam, playerNumParam]);

  const setupMatch = async () => {
    setLoading(true);
    setError(null);
    try {
      addLog("Creating 2-player match on server...");
      const authData = await createMockGame(2);
      const p1 = authData.players[0];
      const p2 = authData.players[1];

      addLog(`Users created: P1=${p1.username} (${p1.id}), P2=${p2.username} (${p2.id})`);

      // Connect STOMP client for P1
      addLog("Connecting setup client P1...");
      const p1Client = await createStompClient(p1.accessToken, p1.username, p1.id);
      await setupUserRepliesSubscription(p1Client);
      await setupUserErrorsSubscription(p1Client);

      // Connect STOMP client for P2
      addLog("Connecting setup client P2...");
      const p2Client = await createStompClient(p2.accessToken, p2.username, p2.id);
      await setupUserRepliesSubscription(p2Client);
      await setupUserErrorsSubscription(p2Client);

      // Create lobby by P1
      addLog("P1 creating private lobby...");
      p1Client.client.publish({
        destination: "/app/lobby/create/private",
        body: JSON.stringify({ tankId: "vanguard-cyber" }),
      });
      const lobbyReply = await waitForReply(p1Client, "LOBBY_CREATED");
      const lobbyId = lobbyReply.payload?.id || lobbyReply.payload?.lobbyId;
      addLog(`Lobby created: ${lobbyId}`);

      await setupLobbyTopicSubscription(p1Client, lobbyId);

      // P2 joins lobby
      addLog("P2 joining lobby...");
      p2Client.client.publish({
        destination: `/app/lobby/join/private/${lobbyId}`,
        body: JSON.stringify({ tankId: "specter" }),
      });
      await waitForReply(p2Client, "LOBBY_JOINED");
      await setupLobbyTopicSubscription(p2Client, lobbyId);

      // Start game
      addLog("P1 launching game create...");
      p1Client.client.publish({
        destination: "/app/game/create",
      });
      const gameReply = await waitForReply(p1Client, "GAME_CREATED");
      const gId = gameReply.payload?.id;
      addLog(`Game session created: ${gId}`);

      await setupGameTopicSubscription(p1Client, gId);
      await setupGameTopicSubscription(p2Client, gId);

      await waitForReply(p1Client, "INITIAL_STATE");
      await waitForReply(p2Client, "INITIAL_STATE");
      addLog("INITIAL_STATE received by both clients!");

      // Clean up setup stomp clients so tab sockets take over
      await p1Client.client.deactivate();
      await p2Client.client.deactivate();
      await new Promise((resolve) => setTimeout(resolve, 400));

      const origin = window.location.origin;
      const url1 = `${origin}/test/mock-game?gameId=${gId}&token=${encodeURIComponent(p1.accessToken)}&playerNum=1`;
      const url2 = `${origin}/test/mock-game?gameId=${gId}&token=${encodeURIComponent(p2.accessToken)}&playerNum=2`;

      setGameSessionId(gId);
      setP1Url(url1);
      setP2Url(url2);

      addLog("Opening Player 1 and Player 2 tabs...");
      window.open(url1, "_blank");
      window.open(url2, "_blank");

    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
      addLog(`ERROR: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Player Tab Branch ──────────────────────────────────────────────────────
  if (isPlayerTab && gameIdParam && playerNumParam) {
    const pNum = Number(playerNumParam);

    if (!initialized) {
      return (
        <div className="fixed inset-0 bg-gray-950 text-white font-mono flex items-center justify-center">
          Initializing Player {pNum} Tab Session...
        </div>
      );
    }

    return (
      <PlayerGameTab
        gameIdParam={gameIdParam}
        playerNum={pNum}
        addLog={addLog}
      />
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Launcher Tab ─────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-gray-950 text-white min-h-screen flex flex-col gap-6">
      <div className="flex justify-between items-center bg-gray-900 p-5 rounded-lg border border-gray-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">2-Player Match Tab Launcher</h1>
          <p className="text-sm text-gray-400 mt-1">
            Creates a mock 2-player game on the server and opens 2 separate browser tabs (Player 1 &amp; Player 2).
          </p>
        </div>
        <button
          onClick={setupMatch}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white shadow-lg disabled:opacity-50 transition"
        >
          {loading ? "Creating Match..." : "Launch 2-Player Match (Open 2 Tabs)"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950 border border-red-500/60 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {gameSessionId && p1Url && p2Url && (
        <div className="bg-gray-900 border border-emerald-500/30 rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-emerald-400">Match Created Successfully!</h2>
            <span className="text-xs font-mono bg-black/50 px-3 py-1 rounded text-gray-300">ID: {gameSessionId}</span>
          </div>
          <p className="text-sm text-gray-300">
            If your browser blocked the pop-up windows, click the buttons below to open the player tabs manually:
          </p>
          <div className="flex gap-4">
            <a
              href={p1Url}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 rounded font-semibold text-white transition text-center"
            >
              Open Player 1 Tab (tt1)
            </a>
            <a
              href={p2Url}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 rounded font-semibold text-white transition text-center"
            >
              Open Player 2 Tab (tt2)
            </a>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
        <h2 className="text-md font-semibold text-gray-300">Launcher Log</h2>
        <div className="bg-black/80 font-mono text-xs p-4 rounded-md overflow-y-auto max-h-60 space-y-1 text-gray-300">
          {logs.length === 0 ? (
            <div className="text-gray-600">Logs will appear here after clicking Launch...</div>
          ) : (
            logs.map((l, idx) => (
              <div key={idx} className="border-b border-gray-900 pb-1">{l}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
  // ─────────────────────────────────────────────────────────────────────────────
}

// ─── PlayerGameTab ─────────────────────────────────────────────────────────────
// Owns the useGameSession hook so it can pass sessionStatus and opponentDisconnected
// down to TestGameView without a double-subscription.
function PlayerGameTab({
  gameIdParam,
  playerNum,
  addLog,
}: {
  gameIdParam: string;
  playerNum: number;
  addLog: (m: string) => void;
}) {
  const { sessionStatus, opponentDisconnected, gameManager } = useGameSession(gameIdParam);

  // Lock body scroll while this full-screen tab is mounted
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* ── Compact header ── */}
      <header className="flex-none flex justify-between items-center bg-gray-900/90 px-4 py-2 border-b border-gray-800 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-emerald-400">
            Player {playerNum} — {playerNum === 1 ? "tt1 · Host" : "tt2 · Guest"}
          </h1>
          <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]" title={gameIdParam}>
            {gameIdParam}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded font-semibold border ${
              sessionStatus === "in_game"
                ? "bg-emerald-900/60 border-emerald-500/40 text-emerald-300"
                : "bg-yellow-900/60 border-yellow-500/40 text-yellow-300"
            }`}
          >
            {sessionStatus === "in_game" ? `P${playerNum} Active` : sessionStatus.replace(/_/g, " ")}
          </span>
        </div>
      </header>

      {/* ── Opponent disconnect banner ── */}
      {opponentDisconnected && sessionStatus === "in_game" && (
        <div className="flex-none px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-center text-sm font-semibold text-amber-400 animate-pulse">
          Opponent disconnected — waiting for reconnect (match clock continues)
        </div>
      )}

      {/* ── Game canvas area fills remaining space ── */}
      <div className="flex-1 min-h-0">
        <TestGameView
          playerNum={playerNum}
          sessionStatus={sessionStatus}
          gameManager={gameManager}
          addLog={addLog}
        />
      </div>
    </div>
  );
}

// ─── TestGameView ──────────────────────────────────────────────────────────────
function TestGameView({
  playerNum,
  sessionStatus,
  gameManager,
  addLog,
}: {
  playerNum: number;
  sessionStatus: SessionStatus;
  gameManager: GameManager | null;
  addLog: (m: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameStateSummary, setGameStateSummary] = useState<string>("");

  // ── Fix: track manager readiness as React state so the engine-construction
  //    effect re-fires when INITIAL_STATE arrives (not just when sessionStatus or
  //    gameManager identity changes).
  const [isManagerReady, setIsManagerReady] = useState<boolean>(false);

  useEffect(() => {
    if (!gameManager) {
      setIsManagerReady(false);
      return;
    }
    // Already ready (e.g. RESYNC arrived before this effect ran)
    if (typeof gameManager.isReady === "function" && gameManager.isReady()) {
      setIsManagerReady(true);
      return;
    }
    // Subscribe; the first state emission signals that INITIAL_STATE / RESYNC
    // has been applied and the manager is ready to drive rendering.
    const unsub = gameManager.subscribe(() => {
      if (typeof gameManager.isReady !== "function" || gameManager.isReady()) {
        setIsManagerReady(true);
      }
    });
    return unsub;
  }, [gameManager]);

  // ── Engine construction — runs only when canvas, session, manager AND readiness
  //    are all satisfied.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sessionStatus !== "in_game" || !gameManager || !isManagerReady) return;

    addLog(`[P${playerNum}] Starting GameEngine…`);

    engineRef.current?.stop();
    const engine = new GameEngine({ canvas, gameManager });
    engineRef.current = engine;
    engine.start();

    const resizeObserver = new ResizeObserver(() => {
      engine.resize();
    });
    resizeObserver.observe(canvas);

    const unsub = gameManager.subscribe((state) => {
      const myTank = state.tanks.find((t) => t.playerId === playerNum);
      const cratesCount = state.lootCrates ? state.lootCrates.length : 0;
      const projCount = state.projectiles ? state.projectiles.length : 0;
      const isMyTurn = state.match.activePlayerId === playerNum;

      const summary = [
        isMyTurn ? `YOUR TURN (P${playerNum})` : `OPPONENT TURN (P${state.match.activePlayerId})`,
        myTank
          ? `HP:${myTank.health} Fuel:${Math.ceil(myTank.fuel)} @ (${myTank.position.x.toFixed(0)},${myTank.position.y.toFixed(0)})`
          : "Tank: —",
        `Proj:${projCount}`,
        `Crates:${cratesCount}`,
        state.match.phase,
      ].join(" | ");

      setGameStateSummary(summary);
    });

    return () => {
      unsub();
      resizeObserver.disconnect();
      engine.stop();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [sessionStatus, gameManager, isManagerReady, playerNum]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* ── Thin status bar ── */}
      <div className="flex-none px-3 py-1 bg-gray-950/80 border-b border-gray-800/60 text-xs text-emerald-400 font-mono truncate">
        {gameStateSummary || `Status: ${sessionStatus}`}
      </div>

      {/* ── Canvas fills all remaining height ── */}
      <div className="relative flex-1 min-h-0">
        {/* Connecting / reconnecting overlay */}
        {(sessionStatus === "connecting_to_game" ||
          sessionStatus === "reconnecting_to_game" ||
          sessionStatus === "starting_game") && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950/80 gap-4">
            <p className="text-white text-lg font-semibold">
              {sessionStatus === "reconnecting_to_game"
                ? "Reconnecting to game…"
                : sessionStatus === "starting_game"
                ? "Starting game…"
                : "Connecting to game…"}
            </p>
            {/* Simple CSS spinner — no external dependency */}
            <div
              style={{
                width: 36,
                height: 36,
                border: "4px solid rgba(255,255,255,0.15)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Not ready yet but in_game: waiting for INITIAL_STATE */}
        {sessionStatus === "in_game" && !isManagerReady && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950/80 gap-4">
            <p className="text-white text-lg font-semibold">Waiting for initial game state…</p>
            <div
              style={{
                width: 36,
                height: 36,
                border: "4px solid rgba(255,255,255,0.15)",
                borderTopColor: "#10b981",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="w-full h-full block bg-black"
          id={`game-canvas-p${playerNum}`}
        />
      </div>
    </div>
  );
}
