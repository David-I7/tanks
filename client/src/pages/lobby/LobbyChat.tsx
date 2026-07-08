import TextInput from "../../components/form/input/TextInput";
import Button from "../../components/buttons/Button";
import useLobbyChat, { type ChatMessage } from "./useLobbyChat";
import { useState, useRef, useEffect } from "react";
import InvalidStateError from "../../errors/InvalidStateError";
import Surface from "../../components/layouts/Surface";

export function LobbyChat({ lobbyId }: { lobbyId: string }) {
  const { messages, username, typingUser, publishMessage, publishTypingEvent } =
    useLobbyChat(lobbyId);
  const [message, setMessage] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  return (
    <Surface className="p-4 md:p-5 flex-1 flex flex-col justify-between h-[380px] w-full">
      <div className="text-[10px] text-text-body-low uppercase tracking-widest font-black mb-2 flex justify-between items-center">
        <span>Lobby Chat</span>
        {typingUser && (
          <span className="text-primary animate-pulse font-normal lowercase italic">
            {typingUser} is writing...
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 bg-background/60 border border-border-low rounded-lg p-3 flex flex-col">
        <div className="flex-1 flex flex-col justify-end">
          <div className="overflow-y-auto max-h-[200px]">
            {messages.map((msg, index) => (
              <LobbyMessage key={index} username={username} message={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 min-h-11 mt-4">
        <div className="flex-1">
          <TextInput
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              publishTypingEvent();
            }}
            id="chat_message"
            name="chat"
            placeholder="Type message..."
          />
        </div>
        <Button
          disabled={message.trim() === ""}
          color="primary"
          className="min-h-11 px-5"
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
    </Surface>
  );
}

type LobbyMessageProps = {
  username: string;
  message: ChatMessage;
};

function LobbyMessage({ username, message }: LobbyMessageProps) {
  if (message.type === "CONNECT" || message.type === "DISCONNECT") {
    const isConnect = message.type === "CONNECT";
    return (
      <div
        className={`text-[11px] font-mono py-1 px-2 mb-1.5 border-l-2 bg-surface-high ${
          isConnect ? "border-success text-success" : "border-error text-error"
        }`}
      >
        {isConnect ? "»" : "«"} {message.payload}
      </div>
    );
  } else if (message.type === "MESSAGE") {
    const isSelf = username === message.sender;
    return (
      <div
        className={`text-xs font-mono py-1 px-1.5 mb-1 bg-surface-high/60 border-b border-divider ${
          isSelf ? "text-right" : "text-left"
        }`}
      >
        <span className={isSelf ? "text-link font-bold" : "text-primary font-bold"}>
          {isSelf ? "YOU" : message.sender}
        </span>
        <span className="text-text-body/30 mx-1.5">:</span>
        <span className="text-text-body-high break-all">{message.payload}</span>
      </div>
    );
  }

  throw new InvalidStateError("Unknown type");
}
