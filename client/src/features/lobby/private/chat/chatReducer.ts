export type ChatMessage = {
  type: "CONNECT" | "DISCONNECT" | "MESSAGE" | "LEAVE";
  sender: string;
  payload: string;
};

export type LobbyChatState = {
  messages: ChatMessage[];
  typingUser: string | null;
};

export type LobbyChatAction =
  | { type: "APPEND_MESSAGE"; message: ChatMessage }
  | { type: "SET_TYPING_USER"; username: string }
  | { type: "CLEAR_TYPING_USER" }
  | { type: "RESET" };

export const INITIAL_CHAT_STATE: LobbyChatState = {
  messages: [],
  typingUser: null,
};

export function chatReducer(
  state: LobbyChatState,
  action: LobbyChatAction,
): LobbyChatState {
  switch (action.type) {
    case "APPEND_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.message],
      };

    case "SET_TYPING_USER":
      return {
        ...state,
        typingUser: action.username,
      };

    case "CLEAR_TYPING_USER":
      if (state.typingUser === null) return state;
      return {
        ...state,
        typingUser: null,
      };

    case "RESET":
      return INITIAL_CHAT_STATE;
  }
}
