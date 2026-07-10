import type { OnlineDiffEnvelope } from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type { OnlineGameplayTransport } from "./OnlineGameplayTransport";
import {
  OnlineDiffSequenceError,
  applyOnlineStateDiff,
  initializeOnlineConfirmedState,
  initializeOnlineConfirmedStateFromResync,
  requestOnlineResyncState,
  type OnlineConfirmedState,
} from "./onlineConfirmedState";

export type OnlineGameplayAuthority = {
  getConfirmedState(): OnlineConfirmedState | null;
  subscribe(listener: (state: OnlineConfirmedState) => void): () => void;
  destroy(): void;
};

export function createOnlineGameplayAuthority(options: {
  transport: OnlineGameplayTransport;
}): OnlineGameplayAuthority {
  return new TransportBackedOnlineGameplayAuthority(options.transport);
}

export type RemoteOnlineGameAuthority = OnlineGameplayAuthority;

export const createRemoteOnlineGameAuthority = createOnlineGameplayAuthority;

class TransportBackedOnlineGameplayAuthority implements OnlineGameplayAuthority {
  private confirmedState: OnlineConfirmedState | null = null;
  private readonly listeners = new Set<(state: OnlineConfirmedState) => void>();
  private readonly unsubscribeTransport: () => void;

  constructor(private readonly transport: OnlineGameplayTransport) {
    this.unsubscribeTransport = transport.subscribeToStateDiffs((diff) => {
      this.applyDiff(diff);
    });
  }

  getConfirmedState(): OnlineConfirmedState | null {
    return this.confirmedState;
  }

  subscribe(listener: (state: OnlineConfirmedState) => void): () => void {
    this.listeners.add(listener);
    if (this.confirmedState) listener(this.confirmedState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.unsubscribeTransport();
    this.listeners.clear();
  }

  private applyDiff(diff: OnlineDiffEnvelope): void {
    if (diff.type === "INITIAL_STATE") {
      this.publish(initializeOnlineConfirmedState(diff));
      return;
    }

    if (this.confirmedState === null) {
      if (diff.type === "RESYNC_STATE") {
        this.publish(initializeOnlineConfirmedStateFromResync(diff));
      }
      return;
    }

    try {
      this.publish(applyOnlineStateDiff(this.confirmedState, diff));
    } catch (error) {
      if (error instanceof OnlineDiffSequenceError && error.kind === "MISSING_DIFF") {
        this.transport.requestResyncState();
        this.publish(requestOnlineResyncState(this.confirmedState));
        return;
      }

      throw error;
    }
  }

  private publish(state: OnlineConfirmedState): void {
    this.confirmedState = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
