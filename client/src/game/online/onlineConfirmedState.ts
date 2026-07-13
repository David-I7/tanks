import type {
  DiffSequence,
  OnlineDiffResponseDto,
  OnlineGameStateSnapshotResponse,
  OnlineIntentRejectionResponse,
  OnlineMovementSegmentResponse,
  OnlineProjectileResolutionResponse,
  PlayerId,
  OnlineResyncStateResponse,
  OnlineTankSnapshotResponse,
  OnlineTerrainPatchResponse,
  OnlineTerrainPatchResponseDto,
  OnlineTerminalGameResponse,
  OnlineTurnTransitionResponse,
  OnlineMoveRequest,
  ServerTick,
} from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type { Vec2 } from "../types";

export type PendingPrediction = {
  intentId: string;
  baseDiffSequence: DiffSequence;
  baseDiffServerTick: ServerTick;
  predictedMovement?: OnlineMovementSegmentResponse["payload"];
};

type ReconciledIntent = {
  intentId: string | null;
  playerId: number | null;
};

export type ConfirmedMovementSegment = OnlineMovementSegmentResponse["payload"] & {
  receivedAtMonotonicMs: number;
  durationMs: number;
};

export type OnlineImpactProjectionEvent = {
  id: number;
  position: Vec2;
  animationId: string;
  projectileDefinitionId: string;
  createdAtMonotonicMs: number;
};

export type OnlineConfirmedState = {
  gameSessionId: string;
  localPlayerId: PlayerId;
  state: OnlineGameStateSnapshotResponse;
  lastConfirmedDiffSequence: DiffSequence;
  lastConfirmedDiffServerTick: ServerTick;
  expectedNextDiffSequence: DiffSequence;
  resyncStatus: OnlineResyncStatus;
  pendingPredictions: PendingPrediction[];
  confirmedMovementSegments: ConfirmedMovementSegment[];
  impactEvents: OnlineImpactProjectionEvent[];
};

export type OnlineResyncStatus =
  | { kind: "READY"; lastResyncSequence: DiffSequence | null }
  | { kind: "REQUESTED"; lastResyncSequence: DiffSequence | null };

export type OnlineDiffSequenceErrorKind = "MISSING_DIFF" | "OUT_OF_ORDER_DIFF";

export class OnlineDiffSequenceError extends Error {
  readonly kind: OnlineDiffSequenceErrorKind;

  constructor(
    readonly expectedSequence: DiffSequence,
    readonly receivedSequence: DiffSequence,
  ) {
    const kind = receivedSequence > expectedSequence ? "MISSING_DIFF" : "OUT_OF_ORDER_DIFF";
    super(`Expected online state diff ${expectedSequence}, received ${receivedSequence}`);
    this.name = "OnlineDiffSequenceError";
    this.kind = kind;
  }
}

export function initializeOnlineConfirmedState(
  diff: OnlineDiffResponseDto,
): OnlineConfirmedState {
  if (diff.type !== "INITIAL_STATE") {
    throw new Error(`Expected INITIAL_STATE diff, received ${diff.type}`);
  }

  const payload = diff.payload as Extract<
    OnlineDiffResponseDto["payload"],
    { expectedNextDiffSequence: DiffSequence }
  >;

  return {
    gameSessionId: diff.gameSessionId,
    localPlayerId: payload.localPlayerId,
    state: payload.state,
    lastConfirmedDiffSequence: diff.sequence,
    lastConfirmedDiffServerTick: diff.serverTick,
    expectedNextDiffSequence: payload.expectedNextDiffSequence,
    resyncStatus: { kind: "READY", lastResyncSequence: null },
    pendingPredictions: [],
    confirmedMovementSegments: [],
    impactEvents: [],
  };
}

export function initializeOnlineConfirmedStateFromResync(
  diff: OnlineDiffResponseDto,
): OnlineConfirmedState {
  if (diff.type !== "RESYNC_STATE") {
    throw new Error(`Expected RESYNC_STATE diff, received ${diff.type}`);
  }

  const payload = diff.payload as OnlineResyncStateResponse["payload"];

  return {
    gameSessionId: diff.gameSessionId,
    localPlayerId: payload.localPlayerId,
    state: payload.state,
    lastConfirmedDiffSequence: diff.sequence,
    lastConfirmedDiffServerTick: diff.serverTick,
    expectedNextDiffSequence: payload.replacesSequence + 1,
    resyncStatus: { kind: "READY", lastResyncSequence: payload.replacesSequence },
    pendingPredictions: [],
    confirmedMovementSegments: [],
    impactEvents: [],
  };
}

export function applyOnlineStateDiffResponse(
  confirmed: OnlineConfirmedState,
  diff: OnlineDiffResponseDto,
  monotonicNowMs: () => number = () => performance.now(),
): OnlineConfirmedState {
  if (diff.type === "RESYNC_STATE") {
    if (isStaleResyncDiff(confirmed, diff as OnlineDiffResponseDto<OnlineResyncStateResponse>)) {
      return confirmed;
    }

    return applyDiffPayload(
      {
        ...confirmed,
        lastConfirmedDiffSequence: diff.sequence,
        lastConfirmedDiffServerTick: diff.serverTick,
        resyncStatus: { kind: "READY", lastResyncSequence: confirmed.resyncStatus.lastResyncSequence },
      },
      diff,
      monotonicNowMs,
    );
  }

  if (confirmed.resyncStatus.kind === "REQUESTED") {
    return confirmed;
  }

  if (
    confirmed.resyncStatus.lastResyncSequence !== null &&
    diff.sequence <= confirmed.resyncStatus.lastResyncSequence
  ) {
    return confirmed;
  }

  if (diff.sequence !== confirmed.expectedNextDiffSequence) {
    throw new OnlineDiffSequenceError(confirmed.expectedNextDiffSequence, diff.sequence);
  }

  const nextConfirmed = {
    ...confirmed,
    lastConfirmedDiffSequence: diff.sequence,
    lastConfirmedDiffServerTick: diff.serverTick,
    expectedNextDiffSequence: diff.sequence + 1,
  };

  const nextWithPayload = applyDiffPayload(nextConfirmed, diff, monotonicNowMs);
  const reconciledIntent = getReconciledIntent(diff);

  if (reconciledIntent === null) {
    return nextWithPayload;
  }

  return {
    ...nextWithPayload,
    pendingPredictions: nextWithPayload.pendingPredictions.filter(
      (prediction) => !isMatchingPendingPrediction(prediction, reconciledIntent),
    ),
  };
}

export function requestOnlineResyncState(confirmed: OnlineConfirmedState): OnlineConfirmedState {
  return {
    ...confirmed,
    resyncStatus: {
      kind: "REQUESTED",
      lastResyncSequence: confirmed.resyncStatus.lastResyncSequence,
    },
  };
}

export function predictOnlineMovement(
  confirmed: OnlineConfirmedState,
  intentId: string,
  playerId: number,
  move: OnlineMoveRequest["payload"],
): OnlineConfirmedState {
  const tank = confirmed.state.tanks.find((candidate) => candidate.playerId === playerId);
  if (!tank) {
    return confirmed;
  }

  const definition = confirmed.state.gameContent.tanks[tank.tankDefinitionId];
  if (!definition) return confirmed;
  const path: Vec2[] = [{ ...tank.position }];
  let fuel = tank.fuel;
  let x = tank.position.x;
  let y = tank.position.y;
  let completedColumns = 0;
  const movementQuantum = definition.movementQuantum;
  for (let step = 0; step < movementQuantum; step += 1) {
    const nextX = Math.round(x) + move.direction;
    if (nextX - definition.halfWidth < 0 || nextX + definition.halfWidth >= confirmed.state.gameContent.world.width) break;
    const surfaceY = confirmed.state.terrain.surface[Math.max(0, Math.min(confirmed.state.terrain.surface.length - 1, nextX))];
    const nextY = (surfaceY ?? y) - definition.trackGroundOffset;
    if (y - nextY > definition.climbCapability) break;
    const ledge = nextY - y > definition.climbCapability;
    const cost = Math.ceil(definition.fuelRate * (ledge ? Math.abs(nextX - x) : Math.hypot(nextX - x, nextY - y)));
    if (cost > fuel) break;
    fuel -= cost;
    if (ledge) path.push({ x: nextX, y });
    x = nextX;
    y = nextY;
    path.push({ x, y });
    completedColumns += 1;
    if (ledge) break;
  }
  if (path.length === 1) return confirmed;
  const predictedMovement: OnlineMovementSegmentResponse["payload"] = {
    intentId,
    playerId,
    tankEntityId: tank.entityId,
    from: tank.position,
    to: path[path.length - 1]!,
    movementPath: path,
    fuelBefore: tank.fuel,
    fuelAfter: fuel,
    fuelSpent: tank.fuel - fuel,
    partial: completedColumns < movementQuantum,
    startedServerTick: confirmed.lastConfirmedDiffServerTick,
    endedServerTick: confirmed.lastConfirmedDiffServerTick,
    durationTicks: 0,
  };

  return {
    ...confirmed,
    pendingPredictions: [
      ...confirmed.pendingPredictions.filter(
        (prediction) => prediction.predictedMovement?.playerId !== playerId,
      ),
      {
        intentId,
        baseDiffSequence: confirmed.lastConfirmedDiffSequence,
        baseDiffServerTick: confirmed.lastConfirmedDiffServerTick,
        predictedMovement,
      },
    ],
  };
}

export function projectOnlineRenderState(
  confirmed: OnlineConfirmedState,
  monotonicNowMs: number = performance.now(),
): OnlineGameStateSnapshotResponse {
  const interpolatedState = applyMovementInterpolation(
    confirmed.state,
    confirmed.confirmedMovementSegments,
    monotonicNowMs,
  );

  return confirmed.pendingPredictions.reduce(
    (state, prediction) =>
      prediction.predictedMovement
        ? applyMovementToSnapshot(state, prediction.predictedMovement)
        : state,
    interpolatedState,
  );
}

function applyDiffPayload(
  confirmed: OnlineConfirmedState,
  diff: OnlineDiffResponseDto,
  monotonicNowMs: () => number,
): OnlineConfirmedState {
  switch (diff.type) {
    case "INITIAL_STATE":
      return initializeOnlineConfirmedState(diff);
    case "RESYNC_STATE":
      const resyncPayload = diff.payload as OnlineResyncStateResponse["payload"];
      return {
        ...confirmed,
        localPlayerId: resyncPayload.localPlayerId,
        state: resyncPayload.state,
        expectedNextDiffSequence: resyncPayload.replacesSequence + 1,
        resyncStatus: { kind: "READY", lastResyncSequence: resyncPayload.replacesSequence },
        pendingPredictions: [],
        confirmedMovementSegments: [],
        impactEvents: [],
      };
    case "MOVEMENT_SEGMENT":
      return applyMovementSegment(
        confirmed,
        diff.payload as OnlineMovementSegmentResponse["payload"],
        monotonicNowMs,
      );
    case "PROJECTILE_RESOLUTION":
      return applyProjectileResolution(
        confirmed,
        diff.payload as OnlineProjectileResolutionResponse["payload"],
        monotonicNowMs,
      );
    case "TERRAIN_PATCH":
      const terrainPayload = diff.payload as OnlineTerrainPatchResponse["payload"];
      return {
        ...confirmed,
        state: {
          ...confirmed.state,
          terrain: applyTerrainPatches(confirmed.state.terrain, terrainPayload.patches),
        },
      };
    case "TURN_TRANSITION":
      const turnPayload = diff.payload as OnlineTurnTransitionResponse["payload"];
      return {
        ...confirmed,
        state: {
          ...confirmed.state,
          match: {
            ...confirmed.state.match,
            phase: turnPayload.phase,
            activePlayerId: turnPayload.activePlayerId,
            turnNumber: turnPayload.turnNumber,
            turnTimeRemainingTicks:
              turnPayload.turnEndsAtServerTick - confirmed.lastConfirmedDiffServerTick,
          },
        },
      };
    case "TERMINAL_GAME":
      const terminalPayload = diff.payload as OnlineTerminalGameResponse["payload"];
      return {
        ...confirmed,
        state: terminalPayload.finalState,
      };
    case "INTENT_REJECTION":
      return confirmed;
  }
}

function applyMovementSegment(
  confirmed: OnlineConfirmedState,
  segment: OnlineMovementSegmentResponse["payload"],
  monotonicNowMs: () => number,
): OnlineConfirmedState {
  return {
    ...confirmed,
    state: applyMovementToSnapshot(confirmed.state, segment),
    confirmedMovementSegments: [
      ...confirmed.confirmedMovementSegments,
      {
        ...segment,
        receivedAtMonotonicMs: monotonicNowMs(),
        durationMs: (segment.durationTicks / confirmed.state.gameContent.world.tickRateHz) * 1000,
      },
    ],
  };
}

function applyMovementToSnapshot(
  state: OnlineGameStateSnapshotResponse,
  movement: OnlineMovementSegmentResponse["payload"],
): OnlineGameStateSnapshotResponse {
  return {
    ...state,
    tanks: state.tanks.map((tank) =>
      tank.entityId === movement.tankEntityId
        ? {
            ...tank,
            position: movement.to,
            fuel: movement.fuelAfter,
          }
        : tank,
    ),
  };
}

function applyMovementInterpolation(
  state: OnlineGameStateSnapshotResponse,
  segments: ConfirmedMovementSegment[],
  monotonicNowMs: number,
): OnlineGameStateSnapshotResponse {
  const activeSegments = segments.filter(
    (segment) =>
      segment.durationMs > 0 &&
      monotonicNowMs >= segment.receivedAtMonotonicMs &&
      monotonicNowMs < segment.receivedAtMonotonicMs + segment.durationMs,
  );

  if (activeSegments.length === 0) {
    return state;
  }

  return {
    ...state,
    tanks: state.tanks.map((tank) => interpolateTank(tank, activeSegments, monotonicNowMs)),
  };
}

function interpolateTank(
  tank: OnlineTankSnapshotResponse,
  segments: ConfirmedMovementSegment[],
  monotonicNowMs: number,
): OnlineTankSnapshotResponse {
  const segment = segments.find((candidate) => candidate.tankEntityId === tank.entityId);
  if (!segment) {
    return tank;
  }

  const progress = Math.min(
    1,
    Math.max(0, (monotonicNowMs - segment.receivedAtMonotonicMs) / segment.durationMs),
  );
  const path = segment.movementPath?.length ? segment.movementPath : [segment.from, segment.to];
  const scaled = progress * Math.max(1, path.length - 1);
  const pathIndex = Math.min(path.length - 2, Math.floor(scaled));
  const from = path[Math.max(0, pathIndex)] ?? segment.from;
  const to = path[Math.min(path.length - 1, pathIndex + 1)] ?? segment.to;
  const pointProgress = scaled - Math.floor(scaled);

  return {
    ...tank,
    position: {
      x: lerp(from.x, to.x, pointProgress),
      y: lerp(from.y, to.y, pointProgress),
    },
    fuel: Math.round(lerp(segment.fuelBefore, segment.fuelAfter, progress)),
  };
}

function applyProjectileResolution(
  confirmed: OnlineConfirmedState,
  resolution: OnlineProjectileResolutionResponse["payload"],
  monotonicNowMs: () => number,
): OnlineConfirmedState {
  return {
    ...confirmed,
    state: {
      ...confirmed.state,
      tanks: confirmed.state.tanks.map((tank) => {
        const damage = resolution.damagedTanks.find(
          (candidate) => candidate.tankEntityId === tank.entityId,
        );

        return damage
          ? {
              ...tank,
              health: damage.remainingHealth,
              alive: damage.remainingHealth > 0,
            }
          : tank;
      }),
      projectiles: confirmed.state.projectiles.filter(
        (projectile) => projectile.entityId !== resolution.projectileEntityId,
      ),
    },
    impactEvents: [
      {
        id: resolution.projectileEntityId,
        position: { ...resolution.impact },
        animationId: resolution.impactRenderAssetId,
        projectileDefinitionId: resolution.projectileDefinitionId,
        createdAtMonotonicMs: monotonicNowMs(),
      },
    ],
  };
}

function applyTerrainPatches(
  terrain: OnlineGameStateSnapshotResponse["terrain"],
  patches: OnlineTerrainPatchResponseDto[],
): OnlineGameStateSnapshotResponse["terrain"] {
  return patches.reduce((currentTerrain, patch) => {
    if (patch.kind === "HEIGHTMAP_RANGE") {
      const surface = [...currentTerrain.surface];
      for (let index = 0; index < patch.surface.length; index += 1) {
        const targetIndex = patch.startX + index;
        if (targetIndex >= 0 && targetIndex < surface.length) {
          surface[targetIndex] = patch.surface[index] ?? surface[targetIndex];
        }
      }

      return {
        ...currentTerrain,
        surface,
      };
    }

    return currentTerrain;
  }, terrain);
}

function isStaleResyncDiff(
  confirmed: OnlineConfirmedState,
  diff: OnlineDiffResponseDto<OnlineResyncStateResponse>,
): boolean {
  const payload = diff.payload as OnlineResyncStateResponse["payload"];
  if (diff.sequence <= confirmed.lastConfirmedDiffSequence) {
    return true;
  }

  return (
    confirmed.resyncStatus.lastResyncSequence !== null &&
    payload.replacesSequence <= confirmed.resyncStatus.lastResyncSequence
  );
}

function getReconciledIntent(diff: OnlineDiffResponseDto): ReconciledIntent | null {
  if (diff.intentId !== null) {
    return {
      intentId: diff.intentId,
      playerId: getDiffPlayerId(diff),
    };
  }

  if (diff.type === "MOVEMENT_SEGMENT" || diff.type === "PROJECTILE_RESOLUTION") {
    const payload = diff.payload as
      | OnlineMovementSegmentResponse["payload"]
      | OnlineProjectileResolutionResponse["payload"];

    return {
      intentId: payload.intentId,
      playerId: getDiffPlayerId(diff),
    };
  }

  if (diff.type === "INTENT_REJECTION") {
    const payload = diff.payload as OnlineIntentRejectionResponse["payload"];
    return {
      intentId: payload.rejectedIntentId,
      playerId: payload.playerId,
    };
  }

  return null;
}

function getDiffPlayerId(diff: OnlineDiffResponseDto): number | null {
  if (diff.type === "MOVEMENT_SEGMENT") {
    return (diff.payload as OnlineMovementSegmentResponse["payload"]).playerId;
  }

  if (diff.type === "PROJECTILE_RESOLUTION") {
    return (diff.payload as OnlineProjectileResolutionResponse["payload"]).ownerPlayerId;
  }

  if (diff.type === "INTENT_REJECTION") {
    return (diff.payload as OnlineIntentRejectionResponse["payload"]).playerId;
  }

  return null;
}

function isMatchingPendingPrediction(
  prediction: PendingPrediction,
  reconciledIntent: ReconciledIntent,
): boolean {
  if (prediction.intentId !== reconciledIntent.intentId) {
    return false;
  }

  if (reconciledIntent.playerId === null) {
    return true;
  }

  const predictedPlayerId = prediction.predictedMovement?.playerId;
  return predictedPlayerId === undefined || predictedPlayerId === reconciledIntent.playerId;
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}
