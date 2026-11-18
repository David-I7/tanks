import { describe, expect, it } from "vitest";
import { mapTopicEventToChat } from "@/features/lobby/private/chat/chatEventMapper";
import {
  chatReducer,
  INITIAL_CHAT_STATE,
} from "@/features/lobby/private/chat/chatReducer";

describe("mapTopicEventToChat", () => {
  it("identifies self vs opponent on lobby events using playerId rather than username", () => {
    const selfConnect = mapTopicEventToChat(
      {
        type: "LOBBY_CONNECT",
        payload: { id: "lobby-1", hostId: "uuid-1", triggeredBy: "uuid-1" },
      },
      "Alice",
      "uuid-1",
    );
    expect(selfConnect).toEqual({
      kind: "message",
      message: {
        type: "CONNECT",
        sender: "uuid-1",
        payload: "You've connected",
      },
      clearTyping: false,
    });

    const opponentDisconnect = mapTopicEventToChat(
      {
        type: "LOBBY_DISCONNECT",
        payload: { id: "lobby-1", hostId: "uuid-1", triggeredBy: "uuid-2" },
      },
      "Alice",
      "uuid-1",
    );
    expect(opponentDisconnect).toEqual({
      kind: "message",
      message: {
        type: "DISCONNECT",
        sender: "uuid-2",
        payload: "Opponent disconnected",
      },
      clearTyping: true,
    });
  });

  it("ignores own CHAT_TYPE and returns typing for opponent", () => {
    expect(
      mapTopicEventToChat(
        { type: "CHAT_TYPE", payload: { triggeredBy: "Alice" } },
        "Alice",
        "uuid-1",
      ),
    ).toEqual({ kind: "ignore" });

    expect(
      mapTopicEventToChat(
        { type: "CHAT_TYPE", payload: { triggeredBy: "Bob" } },
        "Alice",
        "uuid-1",
      ),
    ).toEqual({ kind: "typing", username: "Bob" });
  });

  it("clears typing indicator when opponent sends a chat message", () => {
    expect(
      mapTopicEventToChat(
        {
          type: "CHAT_MESSAGE",
          payload: { triggeredBy: "Bob", message: "glhf" },
        },
        "Alice",
        "uuid-1",
      ),
    ).toEqual({
      kind: "message",
      message: {
        type: "MESSAGE",
        sender: "Bob",
        payload: "glhf",
      },
      clearTyping: true,
    });
  });
});

describe("chatReducer", () => {
  it("appends messages and manages typing user", () => {
    let state = INITIAL_CHAT_STATE;

    state = chatReducer(state, { type: "SET_TYPING_USER", username: "Bob" });
    expect(state.typingUser).toBe("Bob");

    state = chatReducer(state, { type: "CLEAR_TYPING_USER" });
    expect(state.typingUser).toBeNull();

    state = chatReducer(state, {
      type: "APPEND_MESSAGE",
      message: { type: "MESSAGE", sender: "Bob", payload: "hi" },
    });
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].payload).toBe("hi");

    state = chatReducer(state, { type: "RESET" });
    expect(state).toEqual(INITIAL_CHAT_STATE);
  });
});
