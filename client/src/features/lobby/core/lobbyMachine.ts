import type { ApiError } from "@/errors/ApiError";
import type StompError from "@/errors/StompError";
import type { DisconnectReason } from "@/store/useWebSocketStore";

export type LobbyMode = "private" | "quickmatch";

export type LobbyError = StompError | ApiError | Error;

export type LobbyState =
  | {
      status: "DISCONNECTED";
      error: LobbyError | null;
      disconnectReason: DisconnectReason;
    }
  | {
      status: "CONNECTING_TO_LOBBY";
      lobbyId: string | null;
    }
  | {
      status: "WAITING_FOR_PLAYERS";
      lobbyId: string;
      isHost: boolean;
      playerCount: 1;
    }
  | {
      status: "READY_TO_START";
      lobbyId: string;
      isHost: boolean;
      playerCount: 2;
    }
  | {
      status: "CREATING_GAME";
      lobbyId: string;
      isHost: boolean;
      playerCount: 2;
    }
  | {
      status: "IN_GAME";
      lobbyId: string;
      isHost: boolean;
      playerCount: 2;
      gameSessionId: string;
    };

export type LobbyAction =
  | { type: "CONNECT_START"; lobbyId: string | null }
  | { type: "SESSION_ASSIGNED"; lobbyId: string }
  | {
      type: "PLAYER_CONNECTED";
      hostId: string;
      triggeredBy: string;
      myPlayerId: string;
    }
  | { type: "OPPONENT_LEFT"; hostId: string; myPlayerId: string }
  | { type: "START_GAME" }
  | { type: "GAME_CREATED"; gameSessionId: string }
  | { type: "RETURN_TO_LOBBY" }
  | {
      type: "DISCONNECT";
      error: LobbyError | null;
      disconnectReason: DisconnectReason;
    };

export const INITIAL_LOBBY_STATE: LobbyState = {
  status: "DISCONNECTED",
  error: null,
  disconnectReason: null,
};

export function getLobbyId(state: LobbyState): string | null {
  return state.status === "DISCONNECTED" ? null : state.lobbyId;
}

export function lobbyReducer(
  state: LobbyState,
  action: LobbyAction,
  mode: LobbyMode,
): LobbyState {
  switch (action.type) {
    case "CONNECT_START": {
      if (state.status !== "DISCONNECTED") return state;
      return {
        status: "CONNECTING_TO_LOBBY",
        lobbyId: action.lobbyId,
      };
    }

    case "SESSION_ASSIGNED": {
      if (state.status !== "CONNECTING_TO_LOBBY") return state;
      return {
        status: "CONNECTING_TO_LOBBY",
        lobbyId: action.lobbyId,
      };
    }

    case "PLAYER_CONNECTED": {
      if (
        state.status !== "CONNECTING_TO_LOBBY" &&
        state.status !== "WAITING_FOR_PLAYERS" &&
        state.status !== "READY_TO_START"
      ) {
        return state;
      }

      if (!state.lobbyId) return state;

      const isHost = action.hostId === action.myPlayerId;
      const isOpponentJoin = action.triggeredBy !== action.myPlayerId;
      const hasTwoPlayers = isOpponentJoin || !isHost;

      if (!hasTwoPlayers) {
        return {
          status: "WAITING_FOR_PLAYERS",
          lobbyId: state.lobbyId,
          isHost,
          playerCount: 1,
        };
      }

      if (mode === "quickmatch") {
        return {
          status: "CREATING_GAME",
          lobbyId: state.lobbyId,
          isHost,
          playerCount: 2,
        };
      }

      return {
        status: "READY_TO_START",
        lobbyId: state.lobbyId,
        isHost,
        playerCount: 2,
      };
    }

    case "OPPONENT_LEFT": {
      if (
        state.status !== "WAITING_FOR_PLAYERS" &&
        state.status !== "READY_TO_START" &&
        state.status !== "CREATING_GAME" &&
        state.status !== "IN_GAME"
      ) {
        return state;
      }

      if (mode === "quickmatch") {
        return {
          status: "DISCONNECTED",
          error: null,
          disconnectReason: null,
        };
      }

      return {
        status: "WAITING_FOR_PLAYERS",
        lobbyId: state.lobbyId,
        isHost: action.hostId === action.myPlayerId,
        playerCount: 1,
      };
    }

    case "START_GAME": {
      if (state.status !== "READY_TO_START") return state;
      return {
        status: "CREATING_GAME",
        lobbyId: state.lobbyId,
        isHost: state.isHost,
        playerCount: 2,
      };
    }

    case "GAME_CREATED": {
      if (
        state.status !== "READY_TO_START" &&
        state.status !== "CREATING_GAME"
      ) {
        return state;
      }

      return {
        status: "IN_GAME",
        lobbyId: state.lobbyId,
        isHost: state.isHost,
        playerCount: 2,
        gameSessionId: action.gameSessionId,
      };
    }

    case "RETURN_TO_LOBBY": {
      if (state.status !== "IN_GAME") return state;
      return {
        status: "READY_TO_START",
        lobbyId: state.lobbyId,
        isHost: state.isHost,
        playerCount: 2,
      };
    }

    case "DISCONNECT": {
      return {
        status: "DISCONNECTED",
        error: action.error,
        disconnectReason: action.disconnectReason,
      };
    }
  }
}
