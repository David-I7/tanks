import {
  Client,
  StompConfig,
  type IFrame,
  type IPublishParams,
} from "@stomp/stompjs";

type ActivateRequest = {
  onConnect?: (e: IFrame, client: Client) => void;
  onDisconnect?: (e: IFrame, client: Client) => void;
  onStompError?: (e: IFrame, client: Client) => void;
  onWebSocketError?: (e: any, client: Client) => void;
  onWebSocketClose?: (e: any, client: Client) => void;
  accessToken: string;
};

export default class TanksWSClient {
  private client: Client;

  constructor(activateRequest: ActivateRequest) {
    this.client = new Client({
      brokerURL: import.meta.env.VITE_BASE_WEBSOCKETS_URL,
      reconnectDelay: 0,
      connectHeaders: {
        Authorization: `Bearer ${activateRequest.accessToken}`,
      },
      onConnect: (e) => {
        activateRequest.onConnect?.(e, this.client);
      },
      onDisconnect: (e) => {
        activateRequest.onDisconnect?.(e, this.client);
      },
      onStompError: (e) => {
        activateRequest.onStompError?.(e, this.client);
      },
      onWebSocketError: (e) => {
        activateRequest.onWebSocketError?.(e, this.client);
      },
      onWebSocketClose: (e) => {
        activateRequest.onWebSocketClose?.(e, this.client);
      },
    });

    this.client.activate();
  }

  disconnect() {
    this.client.deactivate();
  }

  publish(params: IPublishParams) {
    this.client.publish(params);
  }
}
