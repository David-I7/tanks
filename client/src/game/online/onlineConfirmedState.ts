import type {
  DiffSequence,
  OnlineDiffEnvelope,
  OnlineGameStateSnapshot,
  OnlineMovementSegmentDiff,
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

  if (diff.intentId === null) {
    return nextWithPayload;
  }

  return {
    ...nextWithPayload,
    pendingPredictions: nextWithPayload.pendingPredictions.filter(
      (prediction) => prediction.intentId !== diff.intentId,
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
      ...confirmed.pendingPredictions,
      {
        intentId,
        baseDiffSequence: confirmed.lastConfirmedDiffSequence,
        baseDiffServerTick: confirmed.lastConfirmedDiffServerTick,
        predictedMovement,
      },
    ],
  };
}

function applyDiffPayload(
  confirmed: OnlineConfirmedState,
  diff: OnlineDiffEnvelope,
  monotonicNowMs: () => number,
): OnlineConfirmedState {
  if (diff.type !== "MOVEMENT_SEGMENT") {
    return confirmed;
  }

  const segment = diff.payload as OnlineMovementSegmentDiff["payload"];
  return {
    ...confirmed,
    state: {
      ...confirmed.state,
      tanks: confirmed.state.tanks.map((tank) =>
        tank.entityId === segment.tankEntityId
          ? {
              ...tank,
              position: segment.to,
              fuel: segment.fuelAfter,
            }
          : tank,
      ),
    },
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

function ticksToMs(ticks: ServerTick): number {
  return (ticks / SERVER_TICK_RATE_HZ) * 1000;
}
