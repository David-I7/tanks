import type ProblemDetailDto from "@/api/dto/ProblemDetailDto";
import { getErrorMessage } from "@/api/util";
import type { GameEvent } from "@/api/ws/dto/game/GameEventDto";
import type { LobbyEvent } from "@/api/ws/dto/lobby/LobbyEventDto";
import { ApiError } from "@/errors/ApiError";
import StompError from "@/errors/StompError";
import type { LobbyAction, LobbyError, LobbyMode } from "./lobbyMachine";

export type LobbyEventResult = {
  action?: LobbyAction;
  shouldDisconnect?: boolean;
  shouldExit?: boolean;
};

export function handleLobbyTopicEvent(
  event: LobbyEvent,
  myPlayerId: string,
  mode: LobbyMode,
): LobbyEventResult {
  if (event.type === "LOBBY_CONNECT") {
    return {
      action: {
        type: "PLAYER_CONNECTED",
        hostId: event.payload.hostId,
        triggeredBy: event.payload.triggeredBy,
        myPlayerId,
      },
    };
  }

  if (event.type === "LOBBY_LEAVE" || event.type === "LOBBY_DISCONNECT") {
    if (event.payload.triggeredBy === myPlayerId) {
      return {
        action: {
          type: "DISCONNECT",
          error: null,
          disconnectReason: "manualDisconnect",
        },
        shouldDisconnect: true,
      };
    }

    return {
      action: {
        type: "OPPONENT_LEFT",
        hostId: event.payload.hostId,
        myPlayerId,
      },
      shouldExit: mode === "quickmatch",
    };
  }

  return {};
}

export function handleGameReplyEvent(event: GameEvent): LobbyEventResult {
  if (event.type === "GAME_CREATED") {
    return {
      action: {
        type: "GAME_CREATED",
        gameSessionId: event.payload.id,
      },
    };
  }

  return {};
}

export function handleServerErrorEvent(
  problem: ProblemDetailDto,
): LobbyEventResult {
  return {
    action: {
      type: "DISCONNECT",
      error: new ApiError(problem, problem.status),
      disconnectReason: null,
    },
    shouldDisconnect: true,
  };
}

export function toLobbyError(err: unknown): LobbyError {
  if (err instanceof ApiError || err instanceof StompError) {
    return err;
  }

  return new ApiError(
    {
      title: "Unknown Error",
      detail: getErrorMessage(err),
      status: 0,
      type: "about:blank",
      instance: "",
    },
    0,
  );
}
