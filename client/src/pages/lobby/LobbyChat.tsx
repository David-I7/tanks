import { useEffect, useRef, useState, type ReactNode } from "react";
import { debounce, throttle } from "../../utils/performance";
import TanksWSClient from "../../api/ws/TanksWebSocketClient";
import { useAuth } from "../../context/AuthContext";
import TextInput from "../../components/form/input/TextInput";
import Button from "../../components/buttons/Button";
import type { WebSocketEventResponseDto } from "../../api/ws/dto/WebSocketEventResponseDto";
import type UserDto from "../../api/http/dto/UserDto";
import type { ChatEventPayload } from "../../api/ws/dto/chat/ChatEventDto";

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

const throttleTyping = throttle((client: TanksWSClient, id: string) => {
  client.publish({
    destination: "/app/chat/:id/send",
    id,
    body: {
      type: "CHAT_TYPE",
    },
  });
}, 500).fn;

type LobbyChatProps = { lobbyId: string };
type ChatEvent = {
  type: "CONNECT" | "DISCONNECT" | "MESSAGE";
  sender: string;
  payload: string;
};

function webSocketEventToChatEvent(
  event: WebSocketEventResponseDto,
  user: UserDto,
): ChatEvent | null {
  const messageType = event.type.split("_")[1] as ChatEvent["type"];

  switch (messageType) {
    case "CONNECT":
      return {
        type: messageType,
        sender: event.sender,
        payload:
          user.username === event.sender
            ? `You've connected`
            : `${user.username} connected`,
      };
    case "DISCONNECT":
      return {
        type: messageType,
        sender: event.sender,
        payload:
          user.username === event.sender
            ? `You've disconnected`
            : `${user.username} disconnected`,
      };
    case "MESSAGE":
      return {
        type: messageType,
        sender: event.sender,
        payload: (event.payload as ChatEventPayload)!.message,
      };
  }
}

export function LobbyChat({ lobbyId }: LobbyChatProps) {
  const { user } = useAuth();

  if (user == null) throw new Error("User has not been authenticated");

  const [messages, setMessages] = useState<ChatEvent[]>([]);
  const client = useRef<TanksWSClient>(null);
  const [message, setMessage] = useState<string>("");
  const [typingUser, setTypingUser] = useState<string | null>(null);

  useEffect(() => {
    const typingTimeout = debounce(() => {
      setTypingUser(null);
    }, 1000);

    client.current = new TanksWSClient();

    const currentClient = client.current!;

    currentClient.subscribe({
      destination: "/topic/lobby/:id",
      id: lobbyId,
      onMessage: (message) => {
        const messageBody = message.body;

        if (
          messageBody.type === "CHAT_TYPE" ||
          messageBody.type === "CHAT_MESSAGE" ||
          messageBody.type === "LOBBY_DISCONNECT" ||
          messageBody.type === "LOBBY_CONNECT"
        ) {
          if (messageBody.type === "CHAT_TYPE") {
            if (messageBody.sender === user.username) return;
            setTypingUser(messageBody.sender);
            typingTimeout.fn();
            return;
          }

          if (
            messageBody.type === "CHAT_MESSAGE" ||
            messageBody.type === "LOBBY_DISCONNECT"
          ) {
            if (messageBody.sender !== user.username) {
              typingTimeout.cancel();
              setTypingUser(null);
            }
          }

          const nextMessage = webSocketEventToChatEvent(messageBody, user);
          if (nextMessage) {
            setMessages((prev) => [...prev, nextMessage]);
          }
        }
      },
    });

    return () => {
      typingTimeout.cancel();
    };
  }, []);

  return (
    <Layout>
      <div className="h-96 overflow-y-auto flex flex-col justify-end">
        <div className="">
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              username={user!.username}
              message={message}
            />
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
              throttleTyping(client.current!, lobbyId);
            }}
            id="chat_message"
            name="chat"
          />
          <Button
            disabled={message.trim() === ""}
            color="primary"
            onClick={() => {
              client.current!.publish({
                destination: "/app/chat/:id/send",
                id: lobbyId,
                body: {
                  type: "CHAT_MESSAGE",
                  message: message.trim(),
                },
              });
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

type ChatMessageProps = {
  username: string;
  message: ChatEvent;
};

function ChatMessage({ username, message }: ChatMessageProps) {
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

  throw new Error("Unknown type");
}
