import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import TanksClient from "../../api/http/TanksClient";
import { createMockGame, createStompClient, type PlayerClient } from "../../../test/integration/mockGameHarness";
import {
  setupGameTopicSubscription,
  setupLobbyTopicSubscription,
  setupUserErrorsSubscription,
  setupUserRepliesSubscription,
  waitForReply,
} from "../../../test/integration/harnessUtils";
import { GameEngine } from "../../game";
import useGameSession from "../game/useGameSession";

export default function MockGameTestPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [mockP2Client, setMockP2Client] = useState<PlayerClient | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(`[TEST-PAGE] ${msg}`);
    setLogs((prev) => [msg, ...prev.slice(0, 99)]);
  };

  const setupMatch = async () => {
    setLoading(true);
    setError(null);
    try {
      addLog("Creating mock game users on server...");
      const authData = await createMockGame(2);
      const p1 = authData.players[0];
      const p2 = authData.players[1];

      addLog(`Users created: P1=${p1.username} (${p1.id}), P2=${p2.username} (${p2.id})`);

      // Set P1 auth store so frontend useWebSocketStore will connect as P1
      useAuthStore.setState({
        accessToken: p1.accessToken,
        user: { id: p1.id, username: p1.username, email: `${p1.username}@test.com` } as any,
        userStatus: { state: "IN_GAME", gameId: "pending" } as any,
      });
      TanksClient.setAccessToken(p1.accessToken);

      // Connect STOMP client for P1
      addLog("Connecting STOMP client for P1...");
      const p1Client = await createStompClient(p1.accessToken, p1.username, p1.id);
      await setupUserRepliesSubscription(p1Client);
      await setupUserErrorsSubscription(p1Client);

      // Connect STOMP client for P2
      addLog("Connecting STOMP client for P2...");
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
      await setupLobbyTopicSubscription(p2Client, lobbyId);

      // P2 joins lobby
      addLog("P2 joining lobby...");
      p2Client.client.publish({
        destination: `/app/lobby/join/private/${lobbyId}`,
        body: JSON.stringify({ tankId: "vanguard-cyber" }),
      });
      await waitForReply(p2Client, "LOBBY_JOINED");

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

      // Clean up standalone test stomp clients so browser's useWebSocketStore can take over P1 socket
      await p1Client.client.deactivate();

      setMockP2Client(p2Client);
      setGameSessionId(gId);

      // Reset browser ws store so it connects with P1 token
      const wsStore = useWebSocketStore.getState();
      if (wsStore.status !== "disconnected") {
        wsStore.disconnect();
      }
      setTimeout(() => {
        useWebSocketStore.getState().connect();
      }, 200);

    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
      addLog(`ERROR: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen flex flex-col gap-4">
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded shadow">
        <div>
          <h1 className="text-xl font-bold text-blue-400">Mock Game Diagnostic Test Harness</h1>
          <p className="text-sm text-gray-400">
            Session ID: {gameSessionId || "None"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={setupMatch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold disabled:opacity-50"
          >
            {loading ? "Setting up..." : "Launch Mock Game Match"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900/80 border border-red-500 rounded text-red-200">
          {error}
        </div>
      )}

      {gameSessionId ? (
        <div className="grid grid-cols-3 gap-4 flex-1">
          <div className="col-span-2 bg-gray-800 rounded p-4 flex flex-col">
            <h2 className="text-lg font-semibold mb-2">Live Match Canvas View</h2>
            <TestGameView gameSessionId={gameSessionId} addLog={addLog} />
          </div>
          <div className="bg-gray-800 rounded p-4 flex flex-col gap-2 overflow-hidden">
            <h2 className="text-lg font-semibold">Diagnostic Event Log</h2>
            <div className="flex-1 bg-black/60 font-mono text-xs p-3 rounded overflow-y-auto space-y-1">
              {logs.map((l, idx) => (
                <div key={idx} className="border-b border-gray-800 pb-1">{l}</div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500 border border-dashed border-gray-700 rounded">
          Click "Launch Mock Game Match" to start a 2-player match and render the live game view.
        </div>
      )}
    </div>
  );
}

function TestGameView({ gameSessionId, addLog }: { gameSessionId: string; addLog: (m: string) => void }) {
  const { sessionStatus, gameManager } = useGameSession(gameSessionId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameStateSummary, setGameStateSummary] = useState<string>("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sessionStatus !== "in_game" || !gameManager) return;

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

    const unsub = gameManager.subscribe((state) => {
      const activeTank = state.tanks.find((t) => t.id === state.match.activePlayerId);
      const summary = `Turn: P${state.match.activePlayerId} | Active Tank Pos: (${activeTank?.position.x.toFixed(1)}, ${activeTank?.position.y.toFixed(1)}) | Angle: ${activeTank?.aimAngle.toFixed(1)}° | Power: ${activeTank?.aimPower.toFixed(1)} | Crates: ${state.crates.length} | Projectiles: ${state.projectiles.length}`;
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
  }, [sessionStatus, gameManager]);

  return (
    <div className="flex flex-col flex-1 gap-2">
      <div className="text-xs bg-gray-900 p-2 rounded text-emerald-400 font-mono">
        Status: {sessionStatus} | {gameStateSummary}
      </div>
      <div className="relative flex-1 min-h-[500px]">
        <canvas
          ref={canvasRef}
          className="w-full h-full min-h-[500px] rounded border border-gray-700 bg-black"
        />
      </div>
    </div>
  );
}
