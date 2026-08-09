import type {
  OnlineDiffBatchResponseDto,
  OnlineDiffResponseDto,
  OnlinePlayerIntentRequestDto,
  OnlineProjectileResolutionResponse,
} from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import { isOnlineDiffBatchResponseDto } from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type { GameManager } from "./gameManager";
import type { GameAction, GameContext, GameState, Vec2 } from "../types";
import type { OnlineGameplayTransport } from "../online/OnlineGameplayTransport";
import { toGameState } from "../online/onlineGameState";
import { onlineGameContentFromResponse } from "../online/onlineGameContent";
import {
  ClientVisualSimulation,
  DEFAULT_VIEWPORT_WIDTH,
} from "../simulation/ClientVisualSimulation";
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
import { clampAimAngle } from "../simulation/ballistics";
import { IntentThrottler } from "../online/IntentThrottler";

export function createOnlineGameManager(options: {
  transport: OnlineGameplayTransport;
  ctx: GameContext;
  throttler?: IntentThrottler;
}): GameManager {
  return new TransportBackedOnlineGameManager(options);
}

class TransportBackedOnlineGameManager implements GameManager {
  private activeState: ActiveOnlineGameManager | null = null;
  private readonly listeners = new Set<(state: GameState) => void>();
  private readonly unsubscribeTransport: () => void;
  private readonly transport: OnlineGameplayTransport;
  private readonly ctx: GameContext;
  private readonly throttler?: IntentThrottler;

  constructor(options: {
    transport: OnlineGameplayTransport;
    ctx: GameContext;
    throttler?: IntentThrottler;
  }) {
    this.transport = options.transport;
    this.ctx = options.ctx;
    this.throttler = options.throttler;
    this.unsubscribeTransport = this.transport.subscribeToStateDiffs((diff) => {
      this.applyDiff(diff);
    });
    this.transport.requestResyncState();
  }

  submitAction(action: GameAction): boolean {
    if (!this.activeState) return false;
    return this.activeState.submitAction(action);
  }

  update(dt: number = 1 / 60): void {
    this.activeState?.update(dt);
  }

  getState(): GameState {
    if (!this.activeState) {
      throw new Error(
        "Online Game Manager requires Initial State before reading Game State",
      );
    }
    return this.activeState.getState();
  }

  /** Returns true once INITIAL_STATE or RESYNC_STATE has been received. */
  isReady(): boolean {
    return this.activeState !== null;
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

  private applyDiff(diff: OnlineDiffResponseDto | OnlineDiffBatchResponseDto): void {
    if (isOnlineDiffBatchResponseDto(diff)) {
      for (const subDiff of diff.diffs) {
        this.applyDiff(subDiff);
      }
      return;
    }

    if (diff.type === "INITIAL_STATE") {
      this.activeState = new ActiveOnlineGameManager(
        initializeOnlineConfirmedState(diff),
        this.transport,
        this.ctx,
        (state) => this.publishState(state),
        this.throttler,
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
          this.throttler,
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
  private currentState!: GameState;
  private visualSim: ClientVisualSimulation;
  private lastImpactX: number | null = null;
  private readonly throttler: IntentThrottler;
  private deferredDiffs: OnlineDiffResponseDto[] = [];

  constructor(
    initialState: OnlineConfirmedState,
    private readonly transport: OnlineGameplayTransport,
    private readonly ctx: GameContext,
    private readonly publish: (state: GameState) => void,
    throttler?: IntentThrottler,
  ) {
    this.throttler = throttler ?? new IntentThrottler();
    this.confirmedState = initialState;
    this.visualSim = new ClientVisualSimulation(
      0,
      initialState.state.terrain.width,
    );
    this.publishConfirmed(initialState);
  }

  submitAction(action: GameAction): boolean {
    if (action.type === "panCamera") {
      this.visualSim.panCamera(
        action.deltaX,
        DEFAULT_VIEWPORT_WIDTH,
        this.confirmedState.state.terrain.width,
      );
      this.publishConfirmed(this.confirmedState);
      return true;
    }

    if (action.type === "relockCamera") {
      this.visualSim.relockCamera();
      this.publishConfirmed(this.confirmedState);
      return true;
    }

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
      const nowMs = this.ctx.clock();
      if (this.throttler.shouldSendAim(nowMs)) {
        const envelope = this.createIntentEnvelope(action);
        if (envelope) {
          this.transport.sendPlayerIntent(envelope);
        }
      }
      return true;
    }

    if (action.type === "move") {
      const nowMs = this.ctx.clock();
      if (this.throttler.shouldSendMove(nowMs)) {
        const envelope = this.createIntentEnvelope(action);
        if (envelope) {
          this.transport.sendPlayerIntent(envelope);
          this.publishConfirmed(
            predictOnlineMovement(
              this.confirmedState,
              envelope.intentId,
              envelope.playerId,
              { direction: action.direction },
            ),
          );
        }
      }
      return true;
    }

    const envelope = this.createIntentEnvelope(action);
    if (!envelope) return false;
    this.transport.sendPlayerIntent(envelope);

    return true;
  }

  private pendingImpactFx: {
    impact: Vec2;
    damagedTanks?: Array<{ tankEntityId: number; damage: number }>;
    subMunitions?: Array<{
      impact: Vec2;
      damagedTanks: Array<{ tankEntityId: number; damage: number }>;
    }>;
  } | null = null;

  update(dt: number = 1 / 60): void {
    this.visualSim.updateEffects(dt, this.confirmedState.state.terrain.width);

    if (this.confirmedState.state.lootCrates) {
      this.visualSim.updateLootCrates(dt, this.confirmedState.state.lootCrates);
    }

    const flightRes = this.visualSim.updateProjectileFlight(dt);

    if (this.pendingImpactFx && !this.visualSim.getState().activeFlight) {
      const fx = this.pendingImpactFx;
      this.pendingImpactFx = null;
      this.lastImpactX = fx.impact.x;
      this.visualSim.spawnExplosionParticles(fx.impact.x, fx.impact.y);
      this.spawnDamageFloatingTexts(fx.damagedTanks);
      if (fx.subMunitions) {
        for (const sub of fx.subMunitions) {
          this.visualSim.spawnExplosionParticles(sub.impact.x, sub.impact.y);
          this.spawnDamageFloatingTexts(sub.damagedTanks);
        }
      }
    }

    if (!this.visualSim.getState().activeFlight && !this.pendingImpactFx) {
      this.flushDeferredDiffs();
    }

    const activeTank = this.confirmedState.state.tanks.find(
      (tank) => tank.playerId === this.confirmedState.state.match.activePlayerId,
    );
    const focusX = flightRes?.position.x ?? this.lastImpactX ?? activeTank?.position.x ?? null;
    this.visualSim.updateCamera(
      dt,
      focusX,
      DEFAULT_VIEWPORT_WIDTH,
      this.confirmedState.state.terrain.width,
    );

    this.publishConfirmed(this.confirmedState, flightRes);
  }

  getState(): GameState {
    return this.currentState;
  }

  applyDiff(diff: OnlineDiffResponseDto | OnlineDiffBatchResponseDto): void {
    if (isOnlineDiffBatchResponseDto(diff)) {
      for (const subDiff of diff.diffs) {
        this.applyDiff(subDiff);
      }
      return;
    }

    if (diff.type === "RESYNC_STATE") {
      this.deferredDiffs = [];
      this.pendingImpactFx = null;
      this.processSingleDiff(diff);
      return;
    }

    if (diff.type === "PROJECTILE_RESOLUTION") {
      const payload = diff.payload as OnlineProjectileResolutionResponse["payload"];
      const trajectory = payload.trajectory ?? [];
      const tickRate = this.ctx.gameContent.world.tickRateHz || 30;
      const stepSec =
        this.ctx.gameContent.world.projectileTimeStepSeconds || 1 / tickRate;
      const durationSeconds = Math.max(0.3, (trajectory.length - 1) * stepSec);

      this.visualSim.startTrajectoryFlight({
        projectileEntityId: payload.projectileEntityId,
        ownerPlayerId: payload.ownerPlayerId,
        projectileDefinitionId: payload.projectileDefinitionId,
        trajectory,
        durationSeconds,
        elapsedSeconds: 0,
      });

      this.pendingImpactFx = {
        impact: payload.impact,
        damagedTanks: payload.damagedTanks,
        subMunitions: payload.subMunitions,
      };

      this.deferredDiffs.push(diff);
      return;
    }

    const isFlightActive = this.visualSim.getState().activeFlight !== null;
    const hasPendingImpact = this.pendingImpactFx !== null;
    const hasDeferredDiffs = this.deferredDiffs.length > 0;

    if (isFlightActive || hasPendingImpact || hasDeferredDiffs) {
      this.deferredDiffs.push(diff);
      return;
    }

    this.processSingleDiff(diff);
  }

  private processSingleDiff(diff: OnlineDiffResponseDto): void {
    if (diff.type === "TURN_TRANSITION") {
      this.lastImpactX = null;
      this.throttler.reset();
    }

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
        this.deferredDiffs = [];
        this.pendingImpactFx = null;
        this.transport.requestResyncState();
        this.publishConfirmed(requestOnlineResyncState(this.confirmedState));
        return;
      }

      throw error;
    }
  }

  private isSettlementAnimationActive(): boolean {
    const nowMs = this.ctx.clock();
    return this.confirmedState.confirmedMovementSegments.some(
      (segment) =>
        segment.durationMs > 0 &&
        nowMs >= segment.receivedAtMonotonicMs &&
        nowMs < segment.receivedAtMonotonicMs + segment.durationMs,
    );
  }

  private flushDeferredDiffs(): void {
    while (this.deferredDiffs.length > 0) {
      const nextDiff = this.deferredDiffs[0]!;
      if (
        (nextDiff.type === "TURN_TRANSITION" || nextDiff.type === "TERMINAL_GAME") &&
        this.isSettlementAnimationActive()
      ) {
        break;
      }

      const diff = this.deferredDiffs.shift()!;
      this.processSingleDiff(diff);
    }
  }

  private createIntentEnvelope(
    action: GameAction,
  ): OnlinePlayerIntentRequestDto | null {
    const intentId = this.ctx.generateIntentId();
    const common = {
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
          payload: { slot: Number(action.projectileSlotId) || 0 },
        };
      case "fire":
        return {
          ...common,
          type: "FIRE",
          payload: {
            angle: clampAimAngle(action.angle),
            power: Math.max(0, Math.min(1000, action.power)),
          },
        };
      case "aim":
        return {
          ...common,
          type: "AIM",
          payload: {
            angle: clampAimAngle(action.angle),
            power: Math.max(0, Math.min(1000, action.power)),
          },
        };
    }
    return null;
  }

  private publishConfirmed(
    state: OnlineConfirmedState,
    flightRes?: { position: Vec2; velocity: Vec2 } | null,
  ): void {
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
      this.visualSim.getState(),
      flightRes,
    );
    this.publish(this.currentState);
  }

  private spawnDamageFloatingTexts(
    damagedTanks?: Array<{ tankEntityId: number; damage: number }>,
  ): void {
    if (!damagedTanks) return;
    for (const dtank of damagedTanks) {
      const tank = this.confirmedState.state.tanks.find(
        (t) => t.entityId === dtank.tankEntityId,
      );
      if (tank) {
        this.visualSim.spawnFloatingText(
          `-${dtank.damage} HP`,
          "#ef4444",
          tank.position.x,
          tank.position.y - 30,
        );
      }
    }
  }
}
