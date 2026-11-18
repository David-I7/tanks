import { create } from "zustand";

export interface Player {
  nickname: string;
  tankId: string;
  playerId?: string;
  lobbyId?: string;
}

interface PlayerState {
  player: Player;
  setNickname: (nickname: string) => void;
  setTankId: (tankId: string) => void;
  setActiveSession: (session: { playerId: string; lobbyId: string }) => void;
  clearActiveSession: () => void;
}

const NICKNAME_KEY = "tanks_nickname";
const TANK_ID_KEY = "tanks_tankId";

function getInitialPlayer(): Player {
  const nickname = localStorage.getItem(NICKNAME_KEY) ?? "";
  const tankId = localStorage.getItem(TANK_ID_KEY) ?? "";
  return { nickname, tankId };
}

export const usePlayerStore = create<PlayerState>((set) => ({
  player: getInitialPlayer(),
  setNickname: (nickname: string) => {
    try {
      localStorage.setItem(NICKNAME_KEY, nickname);
    } catch {}
    set((state) => ({
      player: { ...state.player, nickname },
    }));
  },
  setTankId: (tankId: string) => {
    try {
      localStorage.setItem(TANK_ID_KEY, tankId);
    } catch {}
    set((state) => ({
      player: { ...state.player, tankId },
    }));
  },
  setActiveSession: (player: { playerId: string; lobbyId: string }) => {
    set((state) => ({
      player: { ...state.player, ...player },
    }));
  },
  clearActiveSession: () => {
    set((state) => ({
      player: { nickname: state.player.nickname, tankId: state.player.tankId },
    }));
  },
}));
