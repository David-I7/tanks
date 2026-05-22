import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import AuthenticatedRoute from "../../components/auth/AuthenticatedRoute";
import TanksWSClient from "../../api/ws/TanksWebSocketClient";
import TextInput from "../../components/form/input/TextInput";
import Button from "../../components/buttons/Button";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";
import { debounce } from "../../utils/performance";

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

type ChatMessageDto = {
  sender: string | null;
  message: string | null;
  type: "MESSAGE" | "TYPING" | "DISCONNECT" | "CONNECT";
};

const testMessages = [
  { type: "CONNECT", sender: "me", message: `You've connected` },
  { type: "MESSAGE", sender: "other", message: `Hello me` },
  { type: "MESSAGE", sender: "other", message: `How are you?` },
];

const debounceTyping = debounce((client: TanksWSClient) => {
  client.publish({
    destination: "/app/chat/send",
    body: JSON.stringify({
      type: "TYPING",
      sender: null,
      message: "typing",
    } as ChatMessageDto),
  });
}, 500).fn;

function ChatContainer() {
  const { user, handleRefresh, accessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const client = useRef<TanksWSClient>(null);
  const [message, setMessage] = useState<string>("");
  const [typingUser, setTypingUser] = useState<string | null>(null);

  useEffect(() => {
    const typingTimeout = debounce(() => {
      setTypingUser(null);
    }, 5000);

    client.current = new TanksWSClient({
      accessToken: accessToken!,
      onConnect: (e, client) => {
        console.log(`On connect: ${e}`);

        client.subscribe("/topic/chat", (message) => {
          console.log(`On message: ${message}`);

          const chatMessageDto = JSON.parse(message.body) as ChatMessageDto;

          if (chatMessageDto.type === "TYPING") {
            if (chatMessageDto.sender === user?.username) return;
            setTypingUser(chatMessageDto.sender);
            typingTimeout.fn();
            return;
          }

          setMessages((prev) => [...prev, chatMessageDto]);
        });

        client.subscribe("/user/queue/errors", (message) => {
          console.log(`On message queue error: ${message}`);
        });

        client.publish({
          destination: "/app/chat/send",
          body: JSON.stringify({
            type: "CONNECT",
            sender: null,
            message: `${user!.username} joined the chat`,
          }),
        });
      },
      onDisconnect: (e) => {
        console.log(`On disconnect: ${e}`);
      },
      onStompError: (e) => {
        console.log(`On stomp Error: ${e}`);
        if (
          e.headers["content-type"] &&
          e.headers["content-type"] === "application/json"
        ) {
          const jsonError: ProblemDetailDto = JSON.parse(e.body);
          // if (jsonError.status === 401) {
          //   handleRefresh();
          // }
          console.log(jsonError);
        }
      },
    });

    return () => {
      client.current!.disconnect();
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
            debounceTyping(client.current!);
          }}
          id="chat_message"
          name="chat"
        />
        <Button
          disabled={message === ""}
          color="primary"
          onClick={() => {
            // setMessages((prev) => [
            //   ...prev,
            //   { type: "MESSAGE", sender: user?.username!, message },
            // ]);

            client.current!.publish({
              destination: "/app/chat/send",
              body: JSON.stringify({
                type: "MESSAGE",
                sender: null,
                message: message,
              }),
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
  message: ChatMessageDto;
};

function ChatMessage({ username, message }: ChatMessageProps) {
  if (message.type === "CONNECT" || message.type === "DISCONNECT") {
    return (
      <div className="text-center text-sm text-text-body-low">
        {username === message.sender ? "You've connected" : message.message}
      </div>
    );
  }

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
