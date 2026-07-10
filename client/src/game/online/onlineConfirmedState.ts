import type {
  DiffSequence,
  OnlineDiffEnvelope,
  OnlineGameStateSnapshot,
  OnlineIntentRejectionDiff,
  OnlineMovementSegmentDiff,
  OnlineProjectileResolutionDiff,
  OnlineResyncStateDiff,
  OnlineTankSnapshot,
  OnlineTerrainPatch,
  OnlineTerrainPatchDiff,
  OnlineTerminalGameDiff,
  OnlineTurnTransitionDiff,
  OnlineMoveIntent,
  ServerTick,
} from "../../api/ws/dto/gameplay/onlineGameplayProtocol";

const SERVER_TICK_RATE_HZ = 30;

export type PendingPrediction = {
  intentId: string;
  baseDiffSequence: DiffSequence;
  baseDiffServerTick: ServerTick;
  predictedMovement?: OnlineMovementSegmentDiff["payload"];
};

type ReconciledIntent = {
  intentId: string;
  playerId: number | null;
};

export type ConfirmedMovementSegment = OnlineMovementSegmentDiff["payload"] & {
  receivedAtMonotonicMs: number;
  durationMs: number;
};

export type OnlineConfirmedState = {
  gameSessionId: string;
  state: OnlineGameStateSnapshot;
  lastConfirmedDiffSequence: DiffSequence;
  lastConfirmedDiffServerTick: ServerTick;
  expectedNextDiffSequence: DiffSequence;
  pendingPredictions: PendingPrediction[];
  confirmedMovementSegments: ConfirmedMovementSegment[];
};

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
  diff: OnlineDiffEnvelope,
): OnlineConfirmedState {
  if (diff.type !== "INITIAL_STATE") {
    throw new Error(`Expected INITIAL_STATE diff, received ${diff.type}`);
  }

  const payload = diff.payload as Extract<
    OnlineDiffEnvelope["payload"],
    { expectedNextDiffSequence: DiffSequence }
  >;

  return {
    gameSessionId: diff.gameSessionId,
    state: payload.state,
    lastConfirmedDiffSequence: diff.sequence,
    lastConfirmedDiffServerTick: diff.serverTick,
    expectedNextDiffSequence: payload.expectedNextDiffSequence,
    pendingPredictions: [],
    confirmedMovementSegments: [],
  };
}

export function applyOnlineStateDiff(
  confirmed: OnlineConfirmedState,
  diff: OnlineDiffEnvelope,
  monotonicNowMs: () => number = () => performance.now(),
): OnlineConfirmedState {
  if (diff.type === "RESYNC_STATE") {
    return applyDiffPayload(
      {
        ...confirmed,
        lastConfirmedDiffSequence: diff.sequence,
        lastConfirmedDiffServerTick: diff.serverTick,
      },
      diff,
      monotonicNowMs,
    );
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

export function predictOnlineMovement(
  confirmed: OnlineConfirmedState,
  intentId: string,
  playerId: number,
  move: OnlineMoveIntent["payload"],
): OnlineConfirmedState {
  const tank = confirmed.state.tanks.find((candidate) => candidate.playerId === playerId);
  if (!tank) {
    return confirmed;
  }

  const distance = Math.abs(move.direction);
  const predictedMovement: OnlineMovementSegmentDiff["payload"] = {
    intentId,
    playerId,
    tankEntityId: tank.entityId,
    from: tank.position,
    to: {
      x: tank.position.x + move.direction,
      y: tank.position.y,
    },
    fuelBefore: tank.fuel,
    fuelAfter: tank.fuel - distance,
    fuelSpent: distance,
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
): OnlineGameStateSnapshot {
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
  diff: OnlineDiffEnvelope,
  monotonicNowMs: () => number,
): OnlineConfirmedState {
  switch (diff.type) {
    case "INITIAL_STATE":
      return initializeOnlineConfirmedState(diff);
    case "RESYNC_STATE":
      const resyncPayload = diff.payload as OnlineResyncStateDiff["payload"];
      return {
        ...confirmed,
        state: resyncPayload.state,
        expectedNextDiffSequence: resyncPayload.replacesSequence + 1,
        pendingPredictions: [],
        confirmedMovementSegments: [],
      };
    case "MOVEMENT_SEGMENT":
      return applyMovementSegment(
        confirmed,
        diff.payload as OnlineMovementSegmentDiff["payload"],
        monotonicNowMs,
      );
    case "PROJECTILE_RESOLUTION":
      return applyProjectileResolution(
        confirmed,
        diff.payload as OnlineProjectileResolutionDiff["payload"],
      );
    case "TERRAIN_PATCH":
      const terrainPayload = diff.payload as OnlineTerrainPatchDiff["payload"];
      return {
        ...confirmed,
        state: {
          ...confirmed.state,
          terrain: applyTerrainPatches(confirmed.state.terrain, terrainPayload.patches),
        },
      };
    case "TURN_TRANSITION":
      const turnPayload = diff.payload as OnlineTurnTransitionDiff["payload"];
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
      const terminalPayload = diff.payload as OnlineTerminalGameDiff["payload"];
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
  segment: OnlineMovementSegmentDiff["payload"],
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
        durationMs: ticksToMs(segment.durationTicks),
      },
    ],
  };
}

function applyMovementToSnapshot(
  state: OnlineGameStateSnapshot,
  movement: OnlineMovementSegmentDiff["payload"],
): OnlineGameStateSnapshot {
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
  state: OnlineGameStateSnapshot,
  segments: ConfirmedMovementSegment[],
  monotonicNowMs: number,
): OnlineGameStateSnapshot {
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
  tank: OnlineTankSnapshot,
  segments: ConfirmedMovementSegment[],
  monotonicNowMs: number,
): OnlineTankSnapshot {
  const segment = segments.find((candidate) => candidate.tankEntityId === tank.entityId);
  if (!segment) {
    return tank;
  }

  const progress = Math.min(
    1,
    Math.max(0, (monotonicNowMs - segment.receivedAtMonotonicMs) / segment.durationMs),
  );

  return {
    ...tank,
    position: {
      x: lerp(segment.from.x, segment.to.x, progress),
      y: lerp(segment.from.y, segment.to.y, progress),
    },
    fuel: lerp(segment.fuelBefore, segment.fuelAfter, progress),
  };
}

function applyProjectileResolution(
  confirmed: OnlineConfirmedState,
  resolution: OnlineProjectileResolutionDiff["payload"],
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
  };
}

function applyTerrainPatches(
  terrain: OnlineGameStateSnapshot["terrain"],
  patches: OnlineTerrainPatch[],
): OnlineGameStateSnapshot["terrain"] {
  return patches.reduce((currentTerrain, patch) => {
    if (currentTerrain.kind === "HEIGHTMAP" && patch.kind === "HEIGHTMAP_RANGE") {
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

    if (currentTerrain.kind === "MASK" && patch.kind === "MASK_RECT") {
      return {
        ...currentTerrain,
        solidBase64: patch.solidBase64,
      };
    }

    return currentTerrain;
  }, terrain);
}

function getReconciledIntent(diff: OnlineDiffEnvelope): ReconciledIntent | null {
  if (diff.intentId !== null) {
    return {
      intentId: diff.intentId,
      playerId: getDiffPlayerId(diff),
    };
  }

  if (diff.type === "MOVEMENT_SEGMENT" || diff.type === "PROJECTILE_RESOLUTION") {
    const payload = diff.payload as
      | OnlineMovementSegmentDiff["payload"]
      | OnlineProjectileResolutionDiff["payload"];

    return {
      intentId: payload.intentId,
      playerId: getDiffPlayerId(diff),
    };
  }

  if (diff.type === "INTENT_REJECTION") {
    const payload = diff.payload as OnlineIntentRejectionDiff["payload"];
    return {
      intentId: payload.rejectedIntentId,
      playerId: payload.playerId,
    };
  }

  return null;
}

function getDiffPlayerId(diff: OnlineDiffEnvelope): number | null {
  if (diff.type === "MOVEMENT_SEGMENT") {
    return (diff.payload as OnlineMovementSegmentDiff["payload"]).playerId;
  }

  if (diff.type === "PROJECTILE_RESOLUTION") {
    return (diff.payload as OnlineProjectileResolutionDiff["payload"]).ownerPlayerId;
  }

  if (diff.type === "INTENT_REJECTION") {
    return (diff.payload as OnlineIntentRejectionDiff["payload"]).playerId;
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

function ticksToMs(ticks: ServerTick): number {
  return (ticks / SERVER_TICK_RATE_HZ) * 1000;
}
