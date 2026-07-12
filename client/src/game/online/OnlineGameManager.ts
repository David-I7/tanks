import type {
  OnlineDiffEnvelope,
  OnlinePlayerIntentEnvelope,
} from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type { GameManager } from "../authority/gameManager";
import type { GameAction, GameState } from "../types";
import { mockGameContent, type GameContent } from "../content/mockGameContent";
import type { OnlineGameplayTransport } from "./OnlineGameplayTransport";
import { onlineConfirmedStateToGameState } from "./onlineGameState";
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

export type OnlineGameManager = GameManager;

export function createOnlineGameManager(options: {
  transport: OnlineGameplayTransport;
  content?: GameContent;
  intentIdFactory?: () => string;
  monotonicNowMs?: () => number;
}): OnlineGameManager {
  return new TransportBackedOnlineGameManager(options);
}

class TransportBackedOnlineGameManager implements OnlineGameManager {
  private confirmedState: OnlineConfirmedState | null = null;
  private currentState: GameState | null = null;
  private readonly listeners = new Set<(state: GameState) => void>();
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
      this.publishState(this.confirmedState);
    }
  }

  getState(): GameState {
    if (this.currentState === null) {
      throw new Error("Online Game Manager requires Initial State before reading Game State");
    }
    return this.currentState;
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    if (this.currentState) listener(this.currentState);
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
    this.publishState(state);
  }

  private publishState(state: OnlineConfirmedState): void {
    const now = this.monotonicNowMs();
    this.currentState = onlineConfirmedStateToGameState(
      state,
      projectOnlineRenderState(state, now),
      this.content,
      now,
    );
    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
}

function createIntentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `intent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
