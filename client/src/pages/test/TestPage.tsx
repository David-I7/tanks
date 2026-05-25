import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import AuthenticatedRoute from "../../components/auth/AuthenticatedRoute";
import TanksWSClient from "../../api/ws/TanksWebSocketClient";
import TextInput from "../../components/form/input/TextInput";
import Button from "../../components/buttons/Button";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import { debounce, throttle } from "../../utils/performance";

export default function TestPage() {
  return (
    <AuthenticatedRoute>
      <Layout>
        <ChatContainer />
      </Layout>
    </AuthenticatedRoute>
  );
}

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

type HeadersOnlyMessageDto = {
  type: "TYPING" | "DISCONNECT" | "CONNECT";
};

type MessageDto = {
  type: "MESSAGE";
  message: string;
};

type ChatMessageRequestDto = HeadersOnlyMessageDto | MessageDto;
type ChatMessageResponseDto = ChatMessageRequestDto & { sender: string };

const testMessages = [
  { type: "CONNECT", sender: "me", message: `You've connected` },
  { type: "MESSAGE", sender: "other", message: `Hello me` },
  { type: "MESSAGE", sender: "other", message: `How are you?` },
];

const throttleTyping = throttle((client: TanksWSClient) => {
  client.publish({
    destination: "/app/chat/:id/send",
    body: {
      type: "TYPING",
    },
  });
}, 500).fn;

function ChatContainer() {
  const { user } = useAuth();

  if (user == null) throw new Error("User has not been authenticated");

  const [messages, setMessages] = useState<ChatMessageResponseDto[]>([]);
  const client = useRef<TanksWSClient>(null);
  const [message, setMessage] = useState<string>("");
  const [typingUser, setTypingUser] = useState<string | null>(null);

  useEffect(() => {
    const typingTimeout = debounce(() => {
      setTypingUser(null);
    }, 1000);

    client.current = new TanksWSClient();

    const currentClient = client.current!;

    currentClient.setOnConnect((frame) => {
      console.log(`On connect: ${frame}`);

      currentClient.subscribe<ProblemDetailDto>({
        destination: "/user/queue/errors",
        onMessage: (message) => {
          console.log(`On message queue error: ${message}`);
        },
      });

      currentClient.subscribe<ChatMessageResponseDto>({
        destination: "/topic/lobby/:id/game",
        id: 1,
        onMessage: (message) => {
          console.log(`Game message: ${message}`);
        },
      });

      currentClient.subscribe<ChatMessageResponseDto>({
        destination: "/topic/lobby/:id/chat",
        id: 1,
        onMessage: (message) => {
          console.log(`Chat message: ${message}`);

          const chatMessage = message.body;

          if (chatMessage.type === "TYPING") {
            if (chatMessage.sender === user.username) return;
            setTypingUser(chatMessage.sender);
            typingTimeout.fn();
            return;
          } else if (chatMessage.type !== "CONNECT") {
            if (chatMessage.sender !== user.username) {
              typingTimeout.cancel();
              setTypingUser(null);
            }
          }

          setMessages((prev) => [...prev, chatMessage]);
        },
      });

      currentClient.publish({
        destination: "/app/chat/:id/send",
        body: { type: "CONNECT" },
      });
    });

    return () => {
      client.current!.deactivate();
      typingTimeout.cancel();
    };
  }, []);

  return (
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
            throttleTyping(client.current!);
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
              body: {
                type: "MESSAGE",
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
  );
}

type ChatMessageProps = {
  username: string;
  message: ChatMessageResponseDto;
};

function ChatMessage({ username, message }: ChatMessageProps) {
  if (message.type === "CONNECT" || message.type === "DISCONNECT") {
    return (
      <div className="text-center text-sm text-text-body-low">
        {username === message.sender &&
          message.type === "CONNECT" &&
          "You've connected"}
        {username !== message.sender &&
          message.type === "CONNECT" &&
          `${message.sender} joined`}
        {username !== message.sender &&
          message.type === "DISCONNECT" &&
          `${message.sender} left`}
      </div>
    );
  } else if (message.type === "MESSAGE") {
    return (
      <div>
        {username === message.sender ? (
          <div className="text-right">
            {message.message}: {message.sender}
          </div>
        ) : (
          <div>
            {message.sender}: {message.message}
          </div>
        )}
      </div>
    );
  }

  throw new Error("Unknown type");
}
