import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import AuthenticatedRoute from "../../components/auth/AuthenticatedRoute";
import TanksWSClient from "../../api/ws/TanksWebSocketClient";
import TextInput from "../../components/form/input/TextInput";
import Button from "../../components/buttons/Button";
import type ProblemDetailDto from "../../api/http/dto/ProblemDetailDto";

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
  sender: string;
  message: string;
};

function ChatContainer() {
  const { user, handleRefresh, accessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const client = useRef<TanksWSClient>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    client.current = new TanksWSClient({
      accessToken: accessToken!,
      onConnect: (e, client) => {
        console.log(`On connect: ${e}`);

        client.subscribe("/topic/chat", (message) =>
          setMessages((prev) => [...prev, JSON.parse(message.body)]),
        );
        client.publish({
          destination: "/topic/chat",
          body: JSON.stringify({
            type: "CHAT_JOIN",
            sender: user!.username,
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
          if (jsonError.status === 401) {
            handleRefresh();
          }
          console.log(jsonError);
        }
      },
    });

    return () => {
      client.current!.disconnect();
    };
  }, []);

  return (
    <div className="h-96 overflow-y-auto flex flex-col justify-between">
      <div>
        {messages.map((message) => (
          <ChatMessage username={user!.username} message={message} />
        ))}
      </div>
      <div className="flex min-h-10">
        <TextInput ref={inputRef} id="chat_message" name="chat" />
        <Button
          disabled={inputRef.current?.value !== ""}
          color="primary"
          onClick={() => {
            client.current!.publish({
              destination: "/topic/chat",
              body: JSON.stringify({
                type: "CHAT_MESSAGE",
                sender: user!.username,
                message: inputRef.current?.value,
              }),
            });
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
  return (
    <div className={`flex`}>
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
