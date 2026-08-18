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
  DEFAULT_EXPLOSION_PALETTE,
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
  throttler: IntentThrottler;
}): GameManager {
  return new TransportBackedOnlineGameManager(options);
}

class TransportBackedOnlineGameManager implements GameManager {
  private activeState: ActiveOnlineGameManager | null = null;
  private readonly listeners = new Set<(state: GameState) => void>();
  private readonly unsubscribeTransport: () => void;
  private readonly transport: OnlineGameplayTransport;
  private readonly ctx: GameContext;
  private readonly throttler: IntentThrottler;

  constructor(options: {
    transport: OnlineGameplayTransport;
    ctx: GameContext;
    throttler: IntentThrottler;
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

  update(dt: number): void {
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
    throttler: IntentThrottler,
  ) {
    this.throttler = throttler;
    this.confirmedState = initialState;
    this.visualSim = new ClientVisualSimulation(
      0,
      initialState.state.terrain.width,
    );
    // Generate biome decorations from the terrain surface
    this.visualSim.generateDecors(initialState.state.terrain.surface);
    this.publishConfirmed(initialState, null);
  }

  submitAction(action: GameAction): boolean {
    if (action.type === "panCamera") {
      this.visualSim.panCamera(action.deltaX);
      this.publishConfirmed(this.confirmedState, null);
      return true;
    }

    if (action.type === "relockCamera") {
      this.visualSim.relockCamera();
      this.publishConfirmed(this.confirmedState, null);
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
        this.publishConfirmed(this.confirmedState, null);
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
              nowMs,
            ),
            null,
          );
        }
      }
      return true;
    }

    if (action.type === "selectProjectileSlot") {
      const activeTank = this.confirmedState.state.tanks.find(
        (tank) => tank.playerId === this.confirmedState.localPlayerId,
      );
      if (activeTank) {
        activeTank.selectedProjectileSlotId = action.projectileSlotId;
        this.publishConfirmed(this.confirmedState, null);
      }
      const envelope = this.createIntentEnvelope(action);
      if (envelope) {
        this.transport.sendPlayerIntent(envelope);
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
    damagedTanks?: Array<{ entityId: number; damageDealt: number }>;
    subMunitions?: Array<{
      impact: Vec2;
      damagedTanks: Array<{ entityId: number; damageDealt: number }>;
    }>;
  } | null = null;
  private postImpactDelaySeconds = 0;

  update(dt: number): void {
    this.visualSim.updateEffects(dt, this.confirmedState.state.terrain.width);

    // Client-side timer countdown between server diffs
    const phase = this.confirmedState.state.match.phase;
    if (phase !== "GAME_OVER") {
      const tickRateHz = this.ctx.gameContent.world.tickRateHz || 30;
      const ticksDelta = dt * tickRateHz;
      const match = this.confirmedState.state.match;
      match.turnTimeRemainingTicks = Math.max(
        0,
        match.turnTimeRemainingTicks - ticksDelta,
      );
      match.matchTimeRemainingTicks = Math.max(
        0,
        match.matchTimeRemainingTicks - ticksDelta,
      );
    }

    // Smoothly interpolate remote player aim angles and power
    const interpolatedAim = this.visualSim.updateAimInterpolation(
      dt,
      this.confirmedState.state.tanks,
    );
    for (const tank of this.confirmedState.state.tanks) {
      if (tank.playerId !== this.confirmedState.localPlayerId) {
        const interp = interpolatedAim.get(tank.playerId);
        if (interp) {
          tank.aimAngle = interp.angle;
          tank.power = interp.power;
        }
      }
    }

    if (this.confirmedState.state.lootCrates) {
      this.visualSim.updateLootCrates(dt, this.confirmedState.state.lootCrates);

      const remainingCrates: typeof this.confirmedState.state.lootCrates = [];
      for (const crate of this.confirmedState.state.lootCrates) {
        if (crate.collected) continue;

        let pickedUp = false;
        for (const tank of this.confirmedState.state.tanks) {
          if (!tank.alive) continue;
          const dist = Math.hypot(
            crate.x - tank.position.x,
            crate.y - tank.position.y,
          );
          if (dist <= 36) {
            crate.collected = true;
            pickedUp = true;
            if (crate.crateType === "hp") {
              tank.health = Math.min(tank.maxHealth, tank.health + 35);
              this.visualSim.spawnFloatingText(
                "+35 HP",
                "#22c55e",
                tank.position.x,
                tank.position.y - 36,
              );
            } else if (crate.crateType === "fuel") {
              tank.fuel = Math.min(tank.maxFuel, tank.fuel + 60);
              this.visualSim.spawnFloatingText(
                "+60 Fuel",
                "#f59e0b",
                tank.position.x,
                tank.position.y - 36,
              );
            } else if (crate.crateType === "ammo") {
              if (tank.weaponAmmo) {
                const uniqueSlots = tank.loadout.filter(
                  (s) => s !== "basicShell" && s !== "standard",
                );
                if (uniqueSlots.length > 0) {
                  const slot =
                    uniqueSlots[Math.floor(Math.random() * uniqueSlots.length)];
                  if (slot && tank.weaponAmmo[slot] !== undefined) {
                    tank.weaponAmmo[slot] = tank.weaponAmmo[slot] + 1;
                  }
                }
              }
              this.visualSim.spawnFloatingText(
                "+1 Ammo",
                "#a855f7",
                tank.position.x,
                tank.position.y - 36,
              );
            }
            break;
          }
        }

        if (!pickedUp && !crate.collected) {
          remainingCrates.push(crate);
        }
      }
      this.confirmedState.state.lootCrates = remainingCrates;
    }

    const flightRes = this.visualSim.updateProjectileFlight(dt);

    if (this.pendingImpactFx && !this.visualSim.getState().activeFlight) {
      const fx = this.pendingImpactFx;
      this.pendingImpactFx = null;
      this.lastImpactX = fx.impact.x;
      this.visualSim.spawnExplosionParticles(
        fx.impact.x,
        fx.impact.y,
        DEFAULT_EXPLOSION_PALETTE,
      );
      this.visualSim.destroyDecorsNear(fx.impact.x, fx.impact.y, 45);
      this.spawnDamageFloatingTexts(fx.damagedTanks);
      if (fx.subMunitions) {
        for (const sub of fx.subMunitions) {
          this.visualSim.spawnExplosionParticles(
            sub.impact.x,
            sub.impact.y,
            DEFAULT_EXPLOSION_PALETTE,
          );
          this.visualSim.destroyDecorsNear(sub.impact.x, sub.impact.y, 35);
          this.spawnDamageFloatingTexts(sub.damagedTanks);
        }
      }
      this.postImpactDelaySeconds = 0.55;
    }

    if (this.postImpactDelaySeconds > 0) {
      this.postImpactDelaySeconds = Math.max(0, this.postImpactDelaySeconds - dt);
    }

    if (
      !this.visualSim.getState().activeFlight &&
      !this.pendingImpactFx &&
      this.postImpactDelaySeconds <= 0
    ) {
      this.flushDeferredDiffs();
    }

    const activeTank = this.confirmedState.state.tanks.find(
      (tank) => tank.playerId === this.confirmedState.state.match.activePlayerId,
    );
    const focusX = flightRes?.position.x ?? this.lastImpactX ?? activeTank?.position.x ?? null;
    this.visualSim.updateCamera(dt, focusX);

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
      this.postImpactDelaySeconds = 0;
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
    const hasPostImpactDelay = this.postImpactDelaySeconds > 0;

    if (isFlightActive || hasPendingImpact || hasDeferredDiffs || hasPostImpactDelay) {
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

    // For remote players, smooth aim updates via interpolation instead of snapping
    if (diff.type === "AIM_UPDATE") {
      const aimPayload = diff.payload as { playerId: number; angle: number; power: number };
      if (aimPayload.playerId !== this.confirmedState.localPlayerId) {
        this.visualSim.setAimTarget(aimPayload.playerId, aimPayload.angle, aimPayload.power);
      }
    }

    if (diff.type === "TERRAIN_PATCH" || diff.type === "RESYNC_STATE") {
      this.visualSim.updateDecorsTerrain(this.confirmedState.state.terrain.surface);
    }

    try {
      this.publishConfirmed(
        applyOnlineStateDiffResponse(
          this.confirmedState,
          diff,
          this.ctx,
        ),
        null,
      );
    } catch (error) {
      if (
        error instanceof OnlineDiffSequenceError &&
        error.kind === "MISSING_DIFF"
      ) {
        this.deferredDiffs = [];
        this.pendingImpactFx = null;
        this.postImpactDelaySeconds = 0;
        this.transport.requestResyncState();
        this.publishConfirmed(requestOnlineResyncState(this.confirmedState), null);
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
        (this.isSettlementAnimationActive() || this.postImpactDelaySeconds > 0)
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
      case "selectProjectileSlot": {
        const localTank = this.confirmedState.state.tanks.find(
          (t) => t.playerId === this.confirmedState.localPlayerId,
        );
        const slotIndex = localTank
          ? localTank.loadout.indexOf(action.projectileSlotId)
          : -1;
        const slot =
          slotIndex >= 0
            ? slotIndex
            : !Number.isNaN(Number(action.projectileSlotId))
            ? Number(action.projectileSlotId)
            : 0;
        return {
          ...common,
          type: "SELECT_PROJECTILE_SLOT",
          payload: { slot },
        };
      }
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
    flightRes: { position: Vec2; velocity: Vec2 } | null,
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
    damagedTanks?: Array<{ entityId: number; damageDealt: number }>,
  ): void {
    if (!damagedTanks) return;
    for (const dtank of damagedTanks) {
      const tank = this.confirmedState.state.tanks.find(
        (t) => t.entityId === dtank.entityId,
      );
      if (tank) {
        this.visualSim.spawnFloatingText(
          `-${dtank.damageDealt} HP`,
          "#ef4444",
          tank.position.x,
          tank.position.y - 30,
        );
      }
    }
  }
}
