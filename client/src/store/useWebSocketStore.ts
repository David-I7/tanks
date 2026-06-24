import { create } from "zustand";
import TanksWSClient from "../api/ws/TanksWebSocketClient";
import { useAuthStore } from "./useAuthStore";
import type ProblemDetailDto from "../api/http/dto/ProblemDetailDto";

export type ConnectionStatus = "connecting" | "connected" | "disconnecting" | "disconnected";

interface WebSocketState {
  client: TanksWSClient | null;
  status: ConnectionStatus;
  error: ProblemDetailDto | null;
  connect: () => void;
  disconnect: () => void;
  clearError: () => void;
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
    const { status } = get();
    if (status !== "disconnected") return; // already connected, connecting, or disconnecting

    const { accessToken, handleRefresh, state } = useAuthStore.getState();

    if (
      state === "unauthenticated" ||
      (state === "loading" && accessToken === null) ||
      state === "error"
    ) {
      throw new Error("User must be authenticated to connect to WebSocket");
    }

    set({ status: "connecting" });

    const newClient = new TanksWSClient(accessToken!, handleRefresh);

    newClient.onConnect(() => {
      set({ status: "connected", error: null });
    });

    newClient.onWebSocketClose(() => {
      set({ status: "disconnected", client: null });
    });

    newClient.onStompError((err) => {
      set({ error: err })
    })

    set({ client: newClient });

    newClient.activate();
  }


  return {
    client: null,
    status: "disconnected",
    error: null,

    connect,

    disconnect: () => {
      const { client, status } = get();
      if (client === null || status === "disconnected" || status === "disconnecting") return;

      set({ status: "disconnecting" });
      client.deactivate();
    },

    clearError: () => {
      const { error } = get();
      if (error !== null) {
        set({ error: null });
      }
    }
  };
});
