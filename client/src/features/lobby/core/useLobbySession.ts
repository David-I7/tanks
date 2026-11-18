import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type ProblemDetailDto from "@/api/dto/ProblemDetailDto";
import type { Message } from "@/api/ws/WebSocketClient";
import type { GameEvent } from "@/api/ws/dto/game/GameEventDto";
import type { LobbyEvent } from "@/api/ws/dto/lobby/LobbyEventDto";
import { useSubscriptionGroup } from "@/hooks/useSubscriptionGroup";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import type { LobbyActionResponseDto } from "../api/dto/LobbyActionResponseDto";
import {
  handleGameReplyEvent,
  handleLobbyTopicEvent,
  handleServerErrorEvent,
  toLobbyError,
} from "./lobbyEventHandlers";
import {
  getLobbyId,
  INITIAL_LOBBY_STATE,
  lobbyReducer,
  type LobbyAction,
  type LobbyMode,
  type LobbyState,
} from "./lobbyMachine";

export type UseLobbySessionOptions = {
  mode: LobbyMode;
  initialLobbyId?: string | null;
  initLobby: () => Promise<LobbyActionResponseDto>;
  onExit: () => void;
};

export type LobbySession = {
  state: LobbyState;
  startGame: () => void;
  returnToLobby: () => void;
  leaveLobby: () => void;
  retry: () => void;
};

export function useLobbySession({
  mode,
  initialLobbyId = null,
  initLobby,
  onExit,
}: UseLobbySessionOptions): LobbySession {
  const {
    subscribe,
    send,
    status: webSocketStatus,
    disconnectReason,
    connect,
    disconnect,
    error: webSocketError,
  } = useWebSocketStore();

  const playerId = usePlayerStore((s) => s.player.playerId);
  const setActiveSession = usePlayerStore((s) => s.setActiveSession);
  const clearActiveSession = usePlayerStore((s) => s.clearActiveSession);

  const { add, cleanup } = useSubscriptionGroup();

  const [state, dispatch] = useReducer(
    (current: LobbyState, action: LobbyAction) =>
      lobbyReducer(current, action, mode),
    INITIAL_LOBBY_STATE,
  );

  const [attempt, setAttempt] = useState(0);
  const initiatedAttemptRef = useRef<number | null>(null);
  const initLobbyRef = useRef(initLobby);
  initLobbyRef.current = initLobby;
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const leaveLobby = useCallback(() => {
    cleanup();
    disconnect();
    clearActiveSession();
    dispatch({
      type: "DISCONNECT",
      error: null,
      disconnectReason: "manualDisconnect",
    });
    onExitRef.current();
  }, [cleanup, disconnect, clearActiveSession]);

  const retry = useCallback(() => {
    if (webSocketStatus !== "disconnected" || state.status !== "DISCONNECTED") {
      return;
    }
    setAttempt((prev) => prev + 1);
  }, [webSocketStatus, state.status]);

  const startGame = useCallback(() => {
    if (state.status !== "READY_TO_START") return;
    if (mode === "private" && !state.isHost) return;
    send({ destination: "/app/game/create" });
    dispatch({ type: "START_GAME" });
  }, [state, mode, send]);

  const returnToLobby = useCallback(() => {
    dispatch({ type: "RETURN_TO_LOBBY" });
  }, []);

  useEffect(() => {
    if (initiatedAttemptRef.current === attempt) return;
    initiatedAttemptRef.current = attempt;

    dispatch({ type: "CONNECT_START", lobbyId: initialLobbyId });

    async function connectSession() {
      try {
        const res = await initLobbyRef.current();
        setActiveSession({ lobbyId: res.lobbyId, playerId: res.playerId });
        dispatch({ type: "SESSION_ASSIGNED", lobbyId: res.lobbyId });
        connect(res.lobbyId, res.playerId);
      } catch (err: unknown) {
        dispatch({
          type: "DISCONNECT",
          error: toLobbyError(err),
          disconnectReason: null,
        });
      }
    }

    connectSession();
  }, [attempt, initialLobbyId, connect, setActiveSession]);

  useEffect(() => {
    if (webSocketError) {
      dispatch({
        type: "DISCONNECT",
        error: webSocketError,
        disconnectReason: "stompError",
      });
    }
  }, [webSocketError]);

  useEffect(() => {
    if (
      webSocketStatus === "disconnected" &&
      disconnectReason !== null &&
      state.status !== "DISCONNECTED"
    ) {
      dispatch({
        type: "DISCONNECT",
        error: webSocketError,
        disconnectReason,
      });
    }
  }, [webSocketStatus, disconnectReason, webSocketError, state.status]);

  const activeLobbyId = getLobbyId(state);

  useEffect(() => {
    if (webSocketStatus !== "connected" || !activeLobbyId || !playerId) return;

    add(
      subscribe({
        destination: "/topic/lobby/:id",
        id: activeLobbyId,
        onMessage: (message: Message<LobbyEvent>) => {
          const result = handleLobbyTopicEvent(message.body, playerId, mode);
          if (result.shouldExit) {
            leaveLobby();
            return;
          }
          if (result.action) {
            dispatch(result.action);
          }
          if (result.shouldDisconnect) {
            disconnect();
          }
        },
      }),
    );

    add(
      subscribe({
        destination: "/user/queue/replies",
        onMessage: (message: Message<GameEvent>) => {
          const result = handleGameReplyEvent(message.body);
          if (result.action) {
            dispatch(result.action);
          }
        },
      }),
    );

    add(
      subscribe<ProblemDetailDto>({
        destination: "/user/queue/errors",
        onMessage: (message) => {
          const result = handleServerErrorEvent(message.body);
          if (result.action) {
            dispatch(result.action);
          }
          if (result.shouldDisconnect) {
            disconnect();
          }
        },
      }),
    );

    return () => {
      cleanup();
    };
  }, [
    webSocketStatus,
    activeLobbyId,
    playerId,
    mode,
    add,
    cleanup,
    subscribe,
    disconnect,
    leaveLobby,
  ]);

  return {
    state,
    startGame,
    returnToLobby,
    leaveLobby,
    retry,
  };
}
