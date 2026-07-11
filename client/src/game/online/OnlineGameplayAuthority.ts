import type {
  OnlineDiffEnvelope,
  OnlinePlayerIntentEnvelope,
} from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type { GameAuthority } from "../authority/gameAuthority";
import type { GameAction, GameViewState } from "../types";
import { mockGameContent, type GameContent } from "../content/mockGameContent";
import type { OnlineGameplayTransport } from "./OnlineGameplayTransport";
import { onlineConfirmedStateToGameViewState } from "./onlineGameViewState";
import {
  OnlineDiffSequenceError,
  applyOnlineStateDiff,
  initializeOnlineConfirmedState,
  initializeOnlineConfirmedStateFromResync,
  predictOnlineMovement,
  projectOnlineRenderState,
  requestOnlineResyncState,
  type OnlineConfirmedState,
} from "./onlineConfirmedState";

export type OnlineGameplayAuthority = GameAuthority & {
  getConfirmedState(): OnlineConfirmedState | null;
  subscribeToConfirmedState(listener: (state: OnlineConfirmedState) => void): () => void;
};

export function createOnlineGameplayAuthority(options: {
  transport: OnlineGameplayTransport;
  content?: GameContent;
  intentIdFactory?: () => string;
  monotonicNowMs?: () => number;
}): OnlineGameplayAuthority {
  return new TransportBackedOnlineGameplayAuthority(options);
}

export type RemoteOnlineGameAuthority = OnlineGameplayAuthority;

export const createRemoteOnlineGameAuthority = createOnlineGameplayAuthority;

class TransportBackedOnlineGameplayAuthority implements OnlineGameplayAuthority {
  private confirmedState: OnlineConfirmedState | null = null;
  private readonly viewListeners = new Set<(state: GameViewState) => void>();
  private readonly confirmedListeners = new Set<(state: OnlineConfirmedState) => void>();
  private readonly unsubscribeTransport: () => void;
  private readonly transport: OnlineGameplayTransport;
  private readonly content: GameContent;
  private readonly intentIdFactory: () => string;
  private readonly monotonicNowMs: () => number;

  constructor(options: {
    transport: OnlineGameplayTransport;
    content?: GameContent;
    intentIdFactory?: () => string;
    monotonicNowMs?: () => number;
  }) {
    this.transport = options.transport;
    this.content = options.content ?? mockGameContent;
    this.intentIdFactory = options.intentIdFactory ?? createIntentId;
    this.monotonicNowMs = options.monotonicNowMs ?? (() => performance.now());
    this.unsubscribeTransport = this.transport.subscribeToStateDiffs((diff) => {
      this.applyDiff(diff);
    });
  }

  submitAction(action: GameAction): boolean {
    if (this.confirmedState === null) return false;
    if (this.confirmedState.state.match.activePlayerId !== this.confirmedState.localPlayerId) {
      return false;
    }

    const envelope = this.createIntentEnvelope(action);
    this.transport.sendPlayerIntent(envelope);

    if (action.type === "move") {
      this.publishConfirmed(
        predictOnlineMovement(
          this.confirmedState,
          envelope.intentId,
          envelope.playerId,
          { direction: action.direction },
        ),
      );
    }

    return true;
  }

  update(): void {
    if (this.confirmedState) {
      this.publishView(this.confirmedState);
    }
  }

  getViewState(): GameViewState | null {
    if (this.confirmedState === null) return null;
    const now = this.monotonicNowMs();
    return onlineConfirmedStateToGameViewState(
      this.confirmedState,
      projectOnlineRenderState(this.confirmedState, now),
      this.content,
      now,
    );
  }

  getConfirmedState(): OnlineConfirmedState | null {
    return this.confirmedState;
  }

  subscribe(listener: (state: GameViewState) => void): () => void {
    this.viewListeners.add(listener);
    const viewState = this.getViewState();
    if (viewState) listener(viewState);
    return () => {
      this.viewListeners.delete(listener);
    };
  }

  subscribeToConfirmedState(listener: (state: OnlineConfirmedState) => void): () => void {
    this.confirmedListeners.add(listener);
    if (this.confirmedState) listener(this.confirmedState);
    return () => {
      this.confirmedListeners.delete(listener);
    };
  }

  destroy(): void {
    this.unsubscribeTransport();
    this.viewListeners.clear();
    this.confirmedListeners.clear();
  }

  private applyDiff(diff: OnlineDiffEnvelope): void {
    if (diff.type === "INITIAL_STATE") {
      this.publishConfirmed(initializeOnlineConfirmedState(diff));
      return;
    }

    if (this.confirmedState === null) {
      if (diff.type === "RESYNC_STATE") {
        this.publishConfirmed(initializeOnlineConfirmedStateFromResync(diff));
      }
      return;
    }

    try {
      this.publishConfirmed(
        applyOnlineStateDiff(this.confirmedState, diff, this.monotonicNowMs),
      );
    } catch (error) {
      if (error instanceof OnlineDiffSequenceError && error.kind === "MISSING_DIFF") {
        this.transport.requestResyncState();
        this.publishConfirmed(requestOnlineResyncState(this.confirmedState));
        return;
      }

      throw error;
    }
  }

  private createIntentEnvelope(action: GameAction): OnlinePlayerIntentEnvelope {
    if (this.confirmedState === null) {
      throw new Error("Cannot create online intent before confirmed state is initialized");
    }

    const intentId = this.intentIdFactory();
    const common = {
      protocolVersion: "online-gameplay.v1" as const,
      gameSessionId: this.confirmedState.gameSessionId,
      playerId: this.confirmedState.localPlayerId,
      intentId,
      lastConfirmedDiffSequence: this.confirmedState.lastConfirmedDiffSequence,
      lastConfirmedDiffServerTick: this.confirmedState.lastConfirmedDiffServerTick,
    };

    switch (action.type) {
      case "move":
        return { ...common, type: "MOVE", payload: { direction: action.direction } };
      case "aim":
        return { ...common, type: "AIM", payload: { angle: action.angle, power: action.power } };
      case "selectProjectileSlot":
        return {
          ...common,
          type: "SELECT_PROJECTILE_SLOT",
          payload: { projectileSlotId: action.projectileSlotId },
        };
      case "fire":
        return {
          ...common,
          type: "FIRE",
          payload: {
            angle: action.angle,
            power: action.power,
            projectileSlotId: action.projectileSlotId,
          },
        };
    }
  }

  private publishConfirmed(state: OnlineConfirmedState): void {
    this.confirmedState = state;
    for (const listener of this.confirmedListeners) {
      listener(state);
    }
    this.publishView(state);
  }

  private publishView(state: OnlineConfirmedState): void {
    const now = this.monotonicNowMs();
    const viewState = onlineConfirmedStateToGameViewState(
      state,
      projectOnlineRenderState(state, now),
      this.content,
      now,
    );
    for (const listener of this.viewListeners) {
      listener(viewState);
    }
  }
}

function createIntentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `intent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
