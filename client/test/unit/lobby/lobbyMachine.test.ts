import { describe, expect, it } from "vitest";
import {
  handleGameReplyEvent,
  handleLobbyTopicEvent,
  handleServerErrorEvent,
} from "@/features/lobby/core/lobbyEventHandlers";
import {
  INITIAL_LOBBY_STATE,
  lobbyReducer,
  type LobbyState,
} from "@/features/lobby/core/lobbyMachine";

describe("lobbyReducer (private mode)", () => {
  it("walks through connect -> wait -> ready -> creating -> in game -> rematch cycle", () => {
    let state: LobbyState = INITIAL_LOBBY_STATE;
    expect(state.status).toBe("DISCONNECTED");

    state = lobbyReducer(
      state,
      { type: "CONNECT_START", lobbyId: null },
      "private",
    );
    expect(state).toEqual({ status: "CONNECTING_TO_LOBBY", lobbyId: null });

    state = lobbyReducer(
      state,
      { type: "SESSION_ASSIGNED", lobbyId: "lobby-1" },
      "private",
    );
    expect(state).toEqual({
      status: "CONNECTING_TO_LOBBY",
      lobbyId: "lobby-1",
    });

    state = lobbyReducer(
      state,
      {
        type: "PLAYER_CONNECTED",
        hostId: "p1",
        triggeredBy: "p1",
        myPlayerId: "p1",
      },
      "private",
    );
    expect(state).toEqual({
      status: "WAITING_FOR_PLAYERS",
      lobbyId: "lobby-1",
      isHost: true,
      playerCount: 1,
    });

    state = lobbyReducer(
      state,
      {
        type: "PLAYER_CONNECTED",
        hostId: "p1",
        triggeredBy: "p2",
        myPlayerId: "p1",
      },
      "private",
    );
    expect(state).toEqual({
      status: "READY_TO_START",
      lobbyId: "lobby-1",
      isHost: true,
      playerCount: 2,
    });

    state = lobbyReducer(state, { type: "START_GAME" }, "private");
    expect(state).toEqual({
      status: "CREATING_GAME",
      lobbyId: "lobby-1",
      isHost: true,
      playerCount: 2,
    });

    state = lobbyReducer(
      state,
      { type: "GAME_CREATED", gameSessionId: "game-1" },
      "private",
    );
    expect(state).toEqual({
      status: "IN_GAME",
      lobbyId: "lobby-1",
      isHost: true,
      playerCount: 2,
      gameSessionId: "game-1",
    });

    // Rematch cycle
    state = lobbyReducer(state, { type: "RETURN_TO_LOBBY" }, "private");
    expect(state).toEqual({
      status: "READY_TO_START",
      lobbyId: "lobby-1",
      isHost: true,
      playerCount: 2,
    });

    state = lobbyReducer(state, { type: "START_GAME" }, "private");
    state = lobbyReducer(
      state,
      { type: "GAME_CREATED", gameSessionId: "game-2" },
      "private",
    );
    expect(state).toEqual({
      status: "IN_GAME",
      lobbyId: "lobby-1",
      isHost: true,
      playerCount: 2,
      gameSessionId: "game-2",
    });
  });

  it("allows non-host to transition from READY_TO_START directly to IN_GAME", () => {
    const readyState: LobbyState = {
      status: "READY_TO_START",
      lobbyId: "lobby-1",
      isHost: false,
      playerCount: 2,
    };

    const next = lobbyReducer(
      readyState,
      { type: "GAME_CREATED", gameSessionId: "game-9" },
      "private",
    );

    expect(next).toEqual({
      status: "IN_GAME",
      lobbyId: "lobby-1",
      isHost: false,
      playerCount: 2,
      gameSessionId: "game-9",
    });
  });

  it("returns private lobby to WAITING_FOR_PLAYERS and promotes host when opponent leaves", () => {
    const readyState: LobbyState = {
      status: "READY_TO_START",
      lobbyId: "lobby-1",
      isHost: false,
      playerCount: 2,
    };

    const next = lobbyReducer(
      readyState,
      { type: "OPPONENT_LEFT", hostId: "p2", myPlayerId: "p2" },
      "private",
    );

    expect(next).toEqual({
      status: "WAITING_FOR_PLAYERS",
      lobbyId: "lobby-1",
      isHost: true,
      playerCount: 1,
    });
  });

  it("ignores invalid transitions", () => {
    const waitingState: LobbyState = {
      status: "WAITING_FOR_PLAYERS",
      lobbyId: "lobby-1",
      isHost: true,
      playerCount: 1,
    };

    expect(
      lobbyReducer(waitingState, { type: "START_GAME" }, "private"),
    ).toBe(waitingState);
    expect(
      lobbyReducer(
        waitingState,
        { type: "GAME_CREATED", gameSessionId: "g1" },
        "private",
      ),
    ).toBe(waitingState);
    expect(
      lobbyReducer(waitingState, { type: "RETURN_TO_LOBBY" }, "private"),
    ).toBe(waitingState);
    expect(
      lobbyReducer(
        waitingState,
        { type: "CONNECT_START", lobbyId: "lobby-2" },
        "private",
      ),
    ).toBe(waitingState);
  });
});

describe("lobbyReducer (quickmatch mode)", () => {
  it("moves straight to CREATING_GAME when 2 players connect and disconnects when opponent leaves", () => {
    let state: LobbyState = {
      status: "CONNECTING_TO_LOBBY",
      lobbyId: "qm-1",
    };

    state = lobbyReducer(
      state,
      {
        type: "PLAYER_CONNECTED",
        hostId: "p1",
        triggeredBy: "p1",
        myPlayerId: "p1",
      },
      "quickmatch",
    );
    expect(state.status).toBe("WAITING_FOR_PLAYERS");

    state = lobbyReducer(
      state,
      {
        type: "PLAYER_CONNECTED",
        hostId: "p1",
        triggeredBy: "p2",
        myPlayerId: "p1",
      },
      "quickmatch",
    );
    expect(state.status).toBe("CREATING_GAME");

    state = lobbyReducer(
      state,
      { type: "GAME_CREATED", gameSessionId: "game-1" },
      "quickmatch",
    );
    expect(state.status).toBe("IN_GAME");

    state = lobbyReducer(state, { type: "RETURN_TO_LOBBY" }, "quickmatch");
    expect(state.status).toBe("READY_TO_START");

    state = lobbyReducer(
      state,
      { type: "OPPONENT_LEFT", hostId: "p1", myPlayerId: "p1" },
      "quickmatch",
    );
    expect(state).toEqual({
      status: "DISCONNECTED",
      error: null,
      disconnectReason: null,
    });
  });
});

describe("lobbyEventHandlers", () => {
  it("flags quickmatch exit when opponent leaves", () => {
    const result = handleLobbyTopicEvent(
      {
        type: "LOBBY_DISCONNECT",
        payload: { id: "qm-1", hostId: "p1", triggeredBy: "p2" },
      },
      "p1",
      "quickmatch",
    );
    expect(result.shouldExit).toBe(true);
    expect(result.action).toEqual({
      type: "OPPONENT_LEFT",
      hostId: "p1",
      myPlayerId: "p1",
    });
  });

  it("maps GAME_CREATED reply to GAME_CREATED action", () => {
    const result = handleGameReplyEvent({
      type: "GAME_CREATED",
      payload: { id: "game-42", hostId: "p1", triggeredBy: "p1" },
    });
    expect(result.action).toEqual({
      type: "GAME_CREATED",
      gameSessionId: "game-42",
    });
  });

  it("maps ProblemDetailDto server errors to DISCONNECT + shouldDisconnect", () => {
    const result = handleServerErrorEvent({
      title: "Bad Request",
      detail: "Lobby is not ready",
      status: 400,
      type: "about:blank",
      instance: "/app/game/create",
    });
    expect(result.shouldDisconnect).toBe(true);
    expect(result.action?.type).toBe("DISCONNECT");
  });
});
