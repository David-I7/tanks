import { useState, useEffect } from "react";
import {
  Play,
  RotateCcw,
  Flag,
  Home,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  X,
  AlertTriangle,
} from "lucide-react";
import Button from "../buttons/Button";
import { useThemeStore } from "../../store/useThemeStore";

export type BattleMenuModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: "local" | "online";
  onForfeit?: () => void;
  onRestart?: () => void;
  onExitToMenu: () => void;
};

export default function BattleMenuModal({
  isOpen,
  onClose,
  mode,
  onForfeit,
  onRestart,
  onExitToMenu,
}: BattleMenuModalProps) {
  const { theme, setTheme } = useThemeStore();
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) {
      setShowForfeitConfirm(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showForfeitConfirm) {
          setShowForfeitConfirm(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showForfeitConfirm]);

  if (!isOpen) return null;

  const handleForfeit = () => {
    if (onForfeit) {
      onForfeit();
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="battle-menu-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-white backdrop-blur-xl flex flex-col gap-6 transform transition-all duration-200 scale-100 animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="text-center flex flex-col items-center gap-1.5 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-xs font-semibold text-primary uppercase tracking-widest">
            {mode === "online" ? "Online Battle" : "Local Hotseat"}
          </div>
          <h2
            id="battle-menu-title"
            className="text-2xl font-black font-heading tracking-wider uppercase bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent"
          >
            Battle Menu
          </h2>
          <p className="text-xs text-zinc-400">
            {mode === "online"
              ? "Match timer continues while menu is open"
              : "Game paused"}
          </p>
        </div>

        {/* Forfeit Confirmation Prompt */}
        {showForfeitConfirm ? (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex flex-col gap-3 text-center">
            <div className="flex items-center justify-center gap-2 text-red-400 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>Are you sure you want to forfeit?</span>
            </div>
            <p className="text-xs text-zinc-300">
              Forfeiting will immediately award the victory to your opponent.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                color="error"
                className="flex-1 min-h-10 text-xs"
                onClick={handleForfeit}
              >
                Yes, Forfeit
              </Button>
              <Button
                color="secondary"
                variant="outline"
                className="flex-1 min-h-10 text-xs"
                onClick={() => setShowForfeitConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* Main Action Buttons */
          <div className="flex flex-col gap-3">
            <Button
              color="primary"
              className="w-full justify-center py-3 text-sm font-bold shadow-lg shadow-primary/20"
              leftIcon={<Play size={18} />}
              onClick={onClose}
            >
              Resume Match
            </Button>

            {mode === "local" && onRestart && (
              <Button
                color="secondary"
                variant="outline"
                className="w-full justify-center py-3 text-sm font-semibold border-zinc-700 hover:bg-zinc-800 text-zinc-200"
                leftIcon={<RotateCcw size={18} />}
                onClick={() => {
                  onRestart();
                  onClose();
                }}
              >
                Restart Match
              </Button>
            )}

            {mode === "online" && (
              <Button
                color="error"
                variant="outline"
                className="w-full justify-center py-3 text-sm font-semibold border-red-500/40 text-red-400 hover:bg-red-950/30"
                leftIcon={<Flag size={18} />}
                onClick={() => setShowForfeitConfirm(true)}
              >
                Forfeit Match
              </Button>
            )}

            <Button
              color="secondary"
              variant="ghost"
              className="w-full justify-center py-3 text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              leftIcon={<Home size={18} />}
              onClick={onExitToMenu}
            >
              Exit to Main Menu
            </Button>
          </div>
        )}

        {/* Quick Settings Bar */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between px-2 text-xs text-zinc-400">
          <span className="font-medium">Quick Settings</span>
          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setIsSoundMuted(!isSoundMuted)}
              className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              title={isSoundMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isSoundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              <span className="text-[11px] font-semibold">
                {isSoundMuted ? "Muted" : "Sound"}
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
              <span className="text-[11px] font-semibold capitalize">
                {theme}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
