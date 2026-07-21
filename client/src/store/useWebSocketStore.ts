import { create } from "zustand";
import TanksWSClient, {
  type EndpointSubscription,
  type PublishParams,
  type SubscriptionCleanup,
} from "../api/ws/TanksWebSocketClient";
import { useAuthStore } from "./useAuthStore";
import WebSocketError from "../errors/WebSocketError";
import InvalidStateError from "../errors/InvalidStateError";
import type { WebSocketEventResponseDto } from "../api/ws/dto/WebSocketEventResponseDto";

export type ConnectionStatus =
  | "connecting"
  | "reconnecting"
  | "connected"
  | "disconnected";

export type DisconnectReason =
  | "stompError"
  | "manualDisconnect"
  | "invalidAccessToken"
  | "browserDisconnect"
  | null;

interface WebSocketState {
  status: ConnectionStatus;
  error: WebSocketError | null;
  disconnectReason: DisconnectReason;
  connect: () => void;
  disconnect: () => void;
  send: (params: PublishParams) => void;
  subscribe: <Data = WebSocketEventResponseDto>(
    params: EndpointSubscription<Data>,
  ) => SubscriptionCleanup;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => {
  let client: TanksWSClient | null = null;
  let disconnectReason: DisconnectReason = null;

  // Subscribe to useAuthStore to handle token updates and logout
  useAuthStore.subscribe((authState) => {
    const { disconnect } = get();
    if (client) {
      if (authState.user === null) {
        // User logged out or token invalidated, disconnect
        disconnectReason = "invalidAccessToken";
        disconnect();
      } else {
        // Token updated, update client
        client.setAccessToken(authState.accessToken);
        client.setRefreshHandler(authState.refresh);
      }
    }
  });

  function createClient() {
    const { accessToken, refresh, user } = useAuthStore.getState();

    if (user === null) {
      throw new InvalidStateError(
        "User must be authenticated to connect to WebSockets",
      );
    }

    client = new TanksWSClient(accessToken!, refresh);

    set({ status: "connecting" });

    client.onConnect(() => {
      set({ status: "connected", error: null, disconnectReason: null });
    });

    client.onWebSocketClose(() => {
      if (disconnectReason === null) {
        disconnectReason = "browserDisconnect";
        set({ status: "reconnecting", error: null, disconnectReason });
      } else {
        set({ status: "disconnected", disconnectReason });
      }
    });

    client.onStompError((err) => {
      disconnectReason = "stompError";
      set({ error: new WebSocketError(err) });
      disconnect();
    });

    client.activate();
    client = client;
  }

  const connect = () => {
    const { status } = get();

    if (status !== "disconnected")
      throw new Error(
        "Client must be disconnected before attempting to connect",
      );

    if (client === null) {
      createClient();
    } else {
      set({ status: "connecting", error: null, disconnectReason: null });
      client.activate();
    }
    disconnectReason = null;
  };

  const disconnect = () => {
    if (client === null) return;
    if (disconnectReason === null) {
      disconnectReason = "manualDisconnect";
    }
    client.deactivate();
  };

  const subscribe = <Data = WebSocketEventResponseDto>(
    params: EndpointSubscription<Data>,
  ) => {
    if (client === null)
      throw new Error("Client must be connected before subscribing to a topic");
    return client.subscribe(params);
  };

  const send = (params: PublishParams) => {
    if (client === null)
      throw new Error("Client must be connected before subscribing to a topic");
    return client.publish(params);
  };

  return {
    status: "disconnected",
    error: null,
    disconnectReason: null,
    connect,
    disconnect,
    send,
    subscribe,
  };
});
