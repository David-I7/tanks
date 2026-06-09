import { createContext, useContext, useEffect, useMemo, useState } from "react";
import TanksWSClient from "../api/ws/TanksWebSocketClient";
import { useAuth } from "./AuthContext";

const WebSocketContext = createContext<{
  client: TanksWSClient;
  connected: boolean;
} | null>(null);

export default WebSocketContext;

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === null) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken, handleRefresh } = useAuth();
  const [connected, setConnected] = useState(false);

  if (user === null || accessToken === null)
    throw new Error("User must be authenticated to use WebSocketProvider");

  const client = useMemo(() => {
    const client = new TanksWSClient(accessToken, handleRefresh);
    client.setOnconnect(() => setConnected(true));
    return client;
  }, [user, accessToken, handleRefresh]);

  useEffect(() => {
    return () => {
      client.deactivate();
    };
  }, [client]);

  return (
    <WebSocketContext.Provider value={{ client, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
