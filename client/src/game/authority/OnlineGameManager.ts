import type {
  OnlineDiffResponseDto,
  OnlinePlayerIntentRequestDto,
} from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type { GameManager } from "./gameManager";
import type { GameAction, GameContext, GameState } from "../types";
import type { OnlineGameplayTransport } from "../online/OnlineGameplayTransport";
import { toGameState } from "../online/onlineGameState";
import { onlineGameContentFromResponse } from "../online/onlineGameContent";
import {
  OnlineDiffSequenceError,
  applyOnlineStateDiffResponse,
  initializeOnlineConfirmedState,
  initializeOnlineConfirmedStateFromResync,
  predictOnlineMovement,
  projectOnlineRenderState,
  requestOnlineResyncState,
  type OnlineConfirmedState,
} from "../online/onlineConfirmedState";

export function createOnlineGameManager(options: {
  transport: OnlineGameplayTransport;
  ctx: GameContext;
}): GameManager {
  return new TransportBackedOnlineGameManager(options);
}

class TransportBackedOnlineGameManager implements GameManager {
  private activeState: ActiveOnlineGameManager | null = null;
  private readonly listeners = new Set<(state: GameState) => void>();
  private readonly unsubscribeTransport: () => void;
  private readonly transport: OnlineGameplayTransport;
  private readonly ctx: GameContext;

  constructor(options: {
    transport: OnlineGameplayTransport;
    ctx: GameContext;
  }) {
    this.transport = options.transport;
    this.ctx = options.ctx;
    this.unsubscribeTransport = this.transport.subscribeToStateDiffs((diff) => {
      this.applyDiff(diff);
    });
  }

  submitAction(action: GameAction): boolean {
    if (!this.activeState) return false;
    return this.activeState.submitAction(action);
  }

  update(): void {
    this.activeState?.update();
  }

  getState(): GameState {
    if (!this.activeState) {
      throw new Error(
        "Online Game Manager requires Initial State before reading Game State",
      );
    }
    return this.activeState.getState();
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    if (this.activeState) listener(this.activeState.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.unsubscribeTransport();
    this.listeners.clear();
  }

  private applyDiff(diff: OnlineDiffResponseDto): void {
    if (diff.type === "INITIAL_STATE") {
      this.activeState = new ActiveOnlineGameManager(
        initializeOnlineConfirmedState(diff),
        this.transport,
        this.ctx,
        (state) => this.publishState(state),
      );
      this.publishState(this.activeState.getState());
      return;
    }

    if (!this.activeState) {
      if (diff.type === "RESYNC_STATE") {
        this.activeState = new ActiveOnlineGameManager(
          initializeOnlineConfirmedStateFromResync(diff),
          this.transport,
          this.ctx,
          (state) => this.publishState(state),
        );
        this.publishState(this.activeState.getState());
      }
      return;
    }

    this.activeState.applyDiff(diff);
  }

  private publishState(state: GameState): void {
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

class ActiveOnlineGameManager {
  private confirmedState: OnlineConfirmedState;
  private currentState: GameState;

  constructor(
    initialState: OnlineConfirmedState,
    private readonly transport: OnlineGameplayTransport,
    private readonly ctx: GameContext,
    private readonly publish: (state: GameState) => void,
  ) {
    this.confirmedState = initialState;
    const renderContent = onlineGameContentFromResponse(
      initialState.state.gameContent,
    );
    const activeCtx: GameContext = {
      ...this.ctx,
      gameContent: renderContent,
    };
    this.currentState = toGameState(
      initialState,
      projectOnlineRenderState(initialState, activeCtx),
      activeCtx,
    );
  }

  submitAction(action: GameAction): boolean {
    if (
      this.confirmedState.state.match.activePlayerId !==
      this.confirmedState.localPlayerId
    ) {
      return false;
    }

    if (action.type === "aim") {
      const activeTank = this.confirmedState.state.tanks.find(
        (tank) => tank.playerId === this.confirmedState.localPlayerId,
      );
      if (activeTank) {
        activeTank.aimAngle = action.angle;
        activeTank.power = action.power;
        this.publishConfirmed(this.confirmedState);
      }
      return true;
    }

    const envelope = this.createIntentEnvelope(action);
    if (!envelope) return false;
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
    this.publishConfirmed(this.confirmedState);
  }

  getState(): GameState {
    return this.currentState;
  }

  applyDiff(diff: OnlineDiffResponseDto): void {
    try {
      this.publishConfirmed(
        applyOnlineStateDiffResponse(
          this.confirmedState,
          diff,
          this.ctx,
        ),
      );
    } catch (error) {
      if (
        error instanceof OnlineDiffSequenceError &&
        error.kind === "MISSING_DIFF"
      ) {
        this.transport.requestResyncState();
        this.publishConfirmed(requestOnlineResyncState(this.confirmedState));
        return;
      }

      throw error;
    }
  }

  private createIntentEnvelope(
    action: GameAction,
  ): OnlinePlayerIntentRequestDto | null {
    const intentId = this.ctx.generateIntentId();
    const common = {
      protocolVersion: "online-gameplay.v1" as const,
      gameSessionId: this.confirmedState.gameSessionId,
      playerId: this.confirmedState.localPlayerId,
      intentId,
      lastConfirmedDiffSequence: this.confirmedState.lastConfirmedDiffSequence,
      lastConfirmedDiffServerTick:
        this.confirmedState.lastConfirmedDiffServerTick,
    };

    switch (action.type) {
      case "move":
        return {
          ...common,
          type: "MOVE",
          payload: { direction: action.direction },
        };
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
      case "aim":
        return null;
    }
    return null;
  }

  private publishConfirmed(state: OnlineConfirmedState): void {
    this.confirmedState = state;
    const renderContent = onlineGameContentFromResponse(
      state.state.gameContent,
    );
    const activeCtx: GameContext = {
      ...this.ctx,
      gameContent: renderContent,
    };
    this.currentState = toGameState(
      state,
      projectOnlineRenderState(state, activeCtx),
      activeCtx,
    );
    this.publish(this.currentState);
  }
}
