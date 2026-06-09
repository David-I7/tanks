import TextInput from "../../components/form/input/TextInput";
import Button from "../../components/buttons/Button";
import useLobbyChat, { type ChatMessage } from "./useLobbyChat";
import { useState, type ReactNode } from "react";
import InvalidStateError from "../../errors/InvalidStateError";

type PropsWithChildren = {
  children: ReactNode;
};

function Layout({ children }: PropsWithChildren) {
  return (
    <div className="p-4 md:p-6 lg:p-8 h-screen min-h-screen grid place-items-center">
      <div className="bg-surface-high">{children}</div>
    </div>
  );
}

export function LobbyChat({ lobbyId }: { lobbyId: string }) {
  const { messages, username, typingUser, publishMessage, publishTypingEvent } =
    useLobbyChat(lobbyId);
  const [message, setMessage] = useState<string>("");

  return (
    <Layout>
      <div className="h-96 overflow-y-auto flex flex-col justify-end">
        <div className="">
          {messages.map((message, index) => (
            <LobbyMessage key={index} username={username} message={message} />
          ))}
          {typingUser && (
            <div className="text-text-body-low text-center text-sm">
              {" "}
              {typingUser} is typing...
            </div>
          )}
        </div>
        <div className="flex min-h-10">
          <TextInput
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              publishTypingEvent();
            }}
            id="chat_message"
            name="chat"
          />
          <Button
            disabled={message.trim() === ""}
            color="primary"
            onClick={() => {
              const messageToSend = message.trim();
              if (messageToSend === "") return;
              publishMessage(messageToSend);
              setMessage("");
            }}
          >
            Send
          </Button>
        </div>
      </div>
    </Layout>
  );
}

type LobbyMessageProps = {
  username: string;
  message: ChatMessage;
};

function LobbyMessage({ username, message }: LobbyMessageProps) {
  if (message.type === "CONNECT" || message.type === "DISCONNECT") {
    return (
      <div className="text-center text-sm text-text-body-low">
        {message.payload}
      </div>
    );
  } else if (message.type === "MESSAGE") {
    return (
      <div>
        {username === message.sender ? (
          <div className="text-right">
            {message.payload}: {message.sender}
          </div>
        ) : (
          <div>
            {message.sender}: {message.payload}
          </div>
        )}
      </div>
    );
  }

  throw new InvalidStateError("Unknown type");
}
