import { create } from "zustand";
import WebSocketClient, {
  type EndpointSubscription,
  type PublishParams,
  type SubscriptionCleanup,
  WebSocketClientBuilder,
} from "../api/ws/WebSocketClient";
import WebSocketError from "../errors/WebSocketError";
import type { WebSocketEventResponseDto } from "../api/ws/dto/WebSocketEventResponseDto";
import StompError from "../errors/StompError";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export type DisconnectReason =
  | "stompError"
  | "manualDisconnect"
  | "browserDisconnect"
  | null;

interface WebSocketState {
  status: ConnectionStatus;
  error: StompError | null;
  disconnectReason: DisconnectReason;
  connect: (lobbyId: string, playerId: string) => void;
  disconnect: () => void;
  send: (params: PublishParams) => void;
  subscribe: <Data = WebSocketEventResponseDto>(
    params: EndpointSubscription<Data>,
  ) => SubscriptionCleanup;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => {
  let client: WebSocketClient | null = null;
  let disconnectReason: DisconnectReason = null;

  function createClient(lobbyId: string, playerId: string) {
    client = new WebSocketClientBuilder()
      .brokerURL(
        `${import.meta.env.VITE_WS_BROKER_URL}?lobbyId=${lobbyId}&playerId=${playerId}`,
      )
      .reconnectDelay(0)
      .debug(import.meta.env.DEV)
      .onConnect(() => {
        set({ status: "connected", error: null, disconnectReason: null });
      })
      .onWebSocketClose(() => {
        if (disconnectReason === null) {
          disconnectReason = "browserDisconnect";
        }
        set({ status: "disconnected", disconnectReason });
      })
      .onStompError((err) => {
        disconnectReason = "stompError";
        set({ error: new StompError(err) });
        disconnect();
      })
      .build();

    set({ status: "connecting", error: null, disconnectReason: null });

    client.activate();
  }

  const connect = (lobbyId: string, playerId: string) => {
    const { status } = get();

    if (status !== "disconnected") {
      throw new WebSocketError(
        "Client must be disconnected before connecting to a lobby",
      );
    }

    createClient(lobbyId, playerId);
  };

  const disconnect = () => {
    if (client === null) return;
    if (disconnectReason === null) {
      disconnectReason = "manualDisconnect";
    }
    try {
      client.deactivate();
    } catch (_) {}
    client = null;
    set({ status: "disconnected", disconnectReason });
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
