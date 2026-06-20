import { create } from "zustand";
import TanksWSClient from "../api/ws/TanksWebSocketClient";
import { useAuthStore } from "./useAuthStore";

interface WebSocketState {
  client: TanksWSClient | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => {
  // Subscribe to useAuthStore to handle token updates and logout
  useAuthStore.subscribe((authState) => {
    const { client, disconnect } = get();
    if (client) {
      if (
        authState.state === "unauthenticated" ||
        authState.state === "error" ||
        !authState.accessToken
      ) {
        // User logged out or token invalidated, disconnect
        disconnect();
      } else {
        // Token updated, update client
        client.setAccessToken(authState.accessToken);
        client.setRefreshHandler(authState.handleRefresh);
      }
    }
  });

  const connect = () => {
    const { client } = get();
    if (client !== null) return; // already connected or connecting

    const { accessToken, handleRefresh, state } = useAuthStore.getState();

    if (
      state === "unauthenticated" ||
      (state === "loading" && accessToken === null) ||
      state === "error"
    ) {
      throw new Error("User must be authenticated to connect to WebSocket");
    }

    const newClient = new TanksWSClient(accessToken!, handleRefresh);

    newClient.onConnect(() => {
      set({ connected: true });
    });

    newClient.onWebSocketClose(() => {
      set({ connected: false, client: null });
    });

    set({ client: newClient });

    newClient.activate();
  }


  return {
    client: null,
    connected: false,

    connect,

    disconnect: () => {
      const { client } = get();
      if (!client) return;

      client.deactivate();
      set({ client: null, connected: false });
    },
  };
});
