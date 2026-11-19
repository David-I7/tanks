import { Trophy, Swords, Home, RotateCcw } from "lucide-react";
import "./GameOverOverlay.css";

export type GameOverOverlayProps = {
  winnerName: string | null;
  isDraw: boolean;
  onReturnHome: () => void;
  onReturnToLobby?: () => void;
};

export default function GameOverOverlay({
  winnerName,
  isDraw,
  onReturnHome,
  onReturnToLobby,
}: GameOverOverlayProps) {
  return (
    <div className="game-over-overlay">
      <div className={`game-over-card ${isDraw ? "draw" : "victory"}`}>
        <div className={`game-over-icon-wrapper ${isDraw ? "draw" : "victory"}`}>
          {isDraw ? <Swords size={32} /> : <Trophy size={32} />}
        </div>

        <h2 className={`game-over-title ${isDraw ? "draw" : "victory"}`}>
          {isDraw ? "DRAW" : "VICTORY"}
        </h2>

        {!isDraw && (
          <div className="game-over-winner-container">
            <div className="game-over-winner-badge">
              <span className="game-over-winner-name">
                {winnerName ?? "Player"}
              </span>
              <span>Wins!</span>
            </div>
          </div>
        )}

        {isDraw && <p className="game-over-draw-text">Match ended in a draw!</p>}

        <div className="flex flex-col gap-2 w-full">
          {onReturnToLobby && (
            <button
              type="button"
              onClick={onReturnToLobby}
              className="game-over-button"
            >
              <RotateCcw size={18} />
              <span>Return to Lobby</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReturnHome}
            className="game-over-button"
          >
            <Home size={18} />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
